import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPOSITORY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
export const DEFAULT_LOOP_LOCK_FILE = path.join(
  REPOSITORY_ROOT,
  ".codex-loop.lock",
);
export const DEFAULT_SPRINT_STATUS_FILE = path.join(
  REPOSITORY_ROOT,
  "_bmad-output/implementation-artifacts/sprint-status.yaml",
);
const OWNER_FILE = "owner.json";
const DEFAULT_MALFORMED_GRACE_MS = 30_000;
const DEFAULT_MAX_OWNER_AGE_MS = 6 * 60 * 60 * 1000;

function processIsAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

function readOwner(lockDir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(lockDir, OWNER_FILE), "utf8"));
  } catch {
    return null;
  }
}

function lockAge(lockDir, now) {
  return Math.max(0, now().getTime() - fs.statSync(lockDir).mtimeMs);
}

export function acquireLoopLock({
  lockFile = DEFAULT_LOOP_LOCK_FILE,
  pid = process.pid,
  now = () => new Date(),
  isAlive = processIsAlive,
  malformedGraceMs = DEFAULT_MALFORMED_GRACE_MS,
  maxOwnerAgeMs = DEFAULT_MAX_OWNER_AGE_MS,
} = {}) {
  const token = crypto.randomUUID();
  const owner = { pid, token, startedAt: now().toISOString() };

  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      fs.mkdirSync(lockFile);
      try {
        fs.writeFileSync(
          path.join(lockFile, OWNER_FILE),
          `${JSON.stringify(owner, null, 2)}\n`,
          { flag: "wx" },
        );
      } catch (error) {
        fs.rmSync(lockFile, { recursive: true, force: true });
        throw error;
      }
      return {
        lockFile,
        token,
        release: () => releaseLoopLock({ lockFile, token }),
      };
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
    }

    let age;
    try {
      age = lockAge(lockFile, now);
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      throw error;
    }
    const existing = readOwner(lockFile);
    if (!existing && age < malformedGraceMs) {
      throw new Error(
        "Another story loop is initializing its repository lock.",
      );
    }
    if (existing?.pid && isAlive(existing.pid) && age < maxOwnerAgeMs) {
      throw new Error(
        `Another story loop owns this repository (PID ${existing.pid}, started ${existing.startedAt ?? "unknown"}).`,
      );
    }

    const quarantine = `${lockFile}.stale-${pid}-${token}`;
    try {
      fs.renameSync(lockFile, quarantine);
    } catch (error) {
      if (error?.code === "ENOENT" || error?.code === "EEXIST") continue;
      throw error;
    }
    fs.rmSync(quarantine, { recursive: true, force: true });
  }
  throw new Error(
    "Could not acquire story loop lock after concurrent recovery attempts.",
  );
}

export function releaseLoopLock({ lockFile = DEFAULT_LOOP_LOCK_FILE, token }) {
  const existing = readOwner(lockFile);
  if (!existing || existing.token !== token) return false;
  const quarantine = `${lockFile}.release-${process.pid}-${token}`;
  try {
    fs.renameSync(lockFile, quarantine);
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
  const movedOwner = readOwner(quarantine);
  if (movedOwner?.token !== token) {
    if (!fs.existsSync(lockFile)) fs.renameSync(quarantine, lockFile);
    return false;
  }
  fs.rmSync(quarantine, { recursive: true, force: true });
  return true;
}

function sprintPrefix(storyId) {
  const match = storyId.match(/^EP(\d+)-ST(\d+)(R?)$/u);
  if (!match)
    throw new Error(`Unsupported story ID for sprint tracking: ${storyId}`);
  return `${Number.parseInt(match[1], 10)}-${Number.parseInt(match[2], 10)}${match[3].toLowerCase()}-`;
}

function requireSingleMatch(content, pattern, label) {
  const matches = [...content.matchAll(pattern)];
  if (matches.length !== 1)
    throw new Error(`Expected one ${label}; found ${matches.length}.`);
  return matches[0];
}

export function syncSprintStatus({
  storyId,
  status,
  statusFile = DEFAULT_SPRINT_STATUS_FILE,
  now = () => new Date(),
}) {
  if (!fs.existsSync(statusFile))
    throw new Error(`Sprint status file not found: ${statusFile}`);
  const mappedStatus =
    status === "ready"
      ? "ready-for-dev"
      : status === "blocked"
        ? "in-progress"
        : status;
  if (
    !["ready-for-dev", "in-progress", "review", "done"].includes(mappedStatus)
  )
    throw new Error(`Unsupported sprint status: ${status}`);
  let content = fs.readFileSync(statusFile, "utf8");
  const prefix = sprintPrefix(storyId).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const storyPattern = new RegExp(
    `^([ \\t]{2}${prefix}[^:]+):[ \\t]+\\S+[ \\t]*$`,
    "gmu",
  );
  requireSingleMatch(content, storyPattern, `sprint entry for ${storyId}`);
  const commentPattern = /^# last_updated:.*$/gmu;
  const fieldPattern = /^last_updated:.*$/gmu;
  requireSingleMatch(content, commentPattern, "last_updated comment");
  requireSingleMatch(content, fieldPattern, "last_updated field");
  const stamp = now().toISOString();
  content = content.replace(storyPattern, `$1: ${mappedStatus}`);
  content = content.replace(commentPattern, `# last_updated: ${stamp}`);
  content = content.replace(fieldPattern, `last_updated: ${stamp}`);
  fs.writeFileSync(statusFile, content);
  return mappedStatus;
}
