import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { classifyDecisionCategory, createAiRequestFile } from "../lib/ai-request-utils.mjs";
import { collectChangedFiles, ensureLoopBaseState, getCurrentBranch, mergeStoryBranchIntoDev } from "../lib/git-utils.mjs";
import { evaluatePathPolicy, matchesGlob } from "../lib/path-policy.mjs";
import { validateRequiredWorkspaceScripts } from "../run-checks.mjs";
import {
  BLOCKED_EXIT_CODE,
  CommandError,
  PHASE_ARTIFACTS,
  createPhaseContractError,
  removePhaseArtifacts,
  runCommand,
  runCommand as runProcessCommand,
  validatePhaseArtifacts,
} from "../lib/process-utils.mjs";
import { runWithRetries } from "../lib/retry-utils.mjs";
import { normalizeChildProcessError } from "../codex-loop.mjs";
import { moveStoryToStatus, parseFrontmatter, validateStory } from "../lib/story-utils.mjs";

const supportsGitChildProcess = (() => {
  try {
    runCommand("git", ["--version"]);
    return true;
  } catch {
    return false;
  }
})();

function makeTempRepo() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "englishpath-story-tools-"));
  runCommand("git", ["init", "-b", "dev"], { cwd: tempDir });
  runCommand("git", ["config", "user.name", "Codex Test"], { cwd: tempDir });
  runCommand("git", ["config", "user.email", "codex@example.com"], { cwd: tempDir });
  return tempDir;
}

function writeFile(repoDir, relativePath, content) {
  const target = path.join(repoDir, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function createTrackedRepo() {
  const repoDir = makeTempRepo();
  writeFile(repoDir, "README.md", "base\n");
  runCommand("git", ["add", "."], { cwd: repoDir });
  runCommand("git", ["commit", "-m", "base"], { cwd: repoDir });

  const remoteDir = fs.mkdtempSync(path.join(os.tmpdir(), "englishpath-remote-"));
  runCommand("git", ["init", "--bare", remoteDir], { cwd: repoDir });
  runCommand("git", ["remote", "add", "origin", remoteDir], { cwd: repoDir });
  runCommand("git", ["push", "-u", "origin", "dev"], { cwd: repoDir });
  return repoDir;
}

function writeStory(repoDir, relativePath, status = "ready") {
  writeFile(
    repoDir,
    relativePath,
    `---
id: EP0-ST003
title: Loop Engineering Hardening
status: ${status}
type: tooling
allowed_paths:
  - scripts/**
  - stories/**
forbidden_paths:
  - apps/**
max_fix_rounds: 2
---

## Goal
Goal

## Acceptance Criteria
AC

## Verification
Check
`
  );
}

function withTempCwd(callback) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "englishpath-phase-"));
  const previousCwd = process.cwd();
  process.chdir(tempDir);

  try {
    return callback(tempDir);
  } finally {
    process.chdir(previousCwd);
  }
}

test("parseFrontmatter reads lists, booleans, and integers", () => {
  const parsed = parseFrontmatter(`---
id: EP0-ST003
status: ready
requires_human_approval: false
max_fix_rounds: 2
allowed_paths:
  - scripts/**
  - stories/**
---

# Story
`);

  assert.equal(parsed.frontmatter.id, "EP0-ST003");
  assert.equal(parsed.frontmatter.requires_human_approval, false);
  assert.equal(parsed.frontmatter.max_fix_rounds, 2);
  assert.deepEqual(parsed.frontmatter.allowed_paths, ["scripts/**", "stories/**"]);
});

test("validateStory accepts absolute story paths when lifecycle matches", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "englishpath-story-"));
  const storyPath = path.join(tempDir, "stories", "in-progress", "EP0-ST003.md");
  writeStory(tempDir, path.join("stories", "in-progress", "EP0-ST003.md"), "in-progress");

  const result = validateStory(storyPath);
  assert.deepEqual(result.issues, []);
});

test("validateStory enforces lifecycle folder and required structure", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "englishpath-story-"));
  const storyPath = path.join(tempDir, "stories", "ready", "EP0-ST003.md");
  writeStory(tempDir, path.join("stories", "ready", "EP0-ST003.md"), "in-progress");

  const result = validateStory(storyPath);
  assert.equal(result.issues.length, 1);
  assert.match(result.issues[0], /does not match lifecycle folder/);
});

test("moveStoryToStatus keeps frontmatter status synchronized", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "englishpath-story-"));
  const readyPath = path.join(tempDir, "stories", "ready", "EP0-ST003.md");
  writeStory(tempDir, path.join("stories", "ready", "EP0-ST003.md"), "ready");

  const previousCwd = process.cwd();
  process.chdir(tempDir);

  try {
    const reviewPath = moveStoryToStatus(readyPath, "review");
    const content = fs.readFileSync(reviewPath, "utf8");

    assert.match(reviewPath, /stories[\\/]review[\\/]/);
    assert.match(content, /status: review/);
  } finally {
    process.chdir(previousCwd);
  }
});

test("forbidden paths override allowed paths and support glob matching", () => {
  assert.equal(matchesGlob("scripts/lib/test.mjs", "scripts/**"), true);

  const result = evaluatePathPolicy(
    ["scripts/lib/test.mjs", "apps/api/main.ts", ".codex-plan.md"],
    ["scripts/**", "apps/**", ".codex-plan.md"],
    ["apps/**", ".codex-plan.md"],
    { ignoredPaths: [".codex-plan.md"] }
  );

  assert.equal(result.find((entry) => entry.file === "scripts/lib/test.mjs")?.ok, true);
  assert.equal(result.find((entry) => entry.file === "apps/api/main.ts")?.ok, false);
  assert.match(result.find((entry) => entry.file === "apps/api/main.ts")?.reason ?? "", /forbidden path pattern/);
});

test("ensureLoopBaseState rejects non-dev branches", (t) => {
  if (!supportsGitChildProcess) {
    t.skip("git child processes are blocked in this sandbox");
    return;
  }

  const repoDir = createTrackedRepo();
  runCommand("git", ["checkout", "-b", "story/ep0-st003"], { cwd: repoDir });
  assert.throws(() => ensureLoopBaseState("dev", { cwd: repoDir }), /Loop must start on "dev"/);
});

test("ensureLoopBaseState rejects branches without upstream", (t) => {
  if (!supportsGitChildProcess) {
    t.skip("git child processes are blocked in this sandbox");
    return;
  }

  const repoDir = makeTempRepo();
  writeFile(repoDir, "README.md", "base\n");
  runCommand("git", ["add", "."], { cwd: repoDir });
  runCommand("git", ["commit", "-m", "base"], { cwd: repoDir });
  assert.throws(() => ensureLoopBaseState("dev", { cwd: repoDir }), /must track an upstream branch/);
});

test("ensureLoopBaseState rejects dirty dev worktrees", (t) => {
  if (!supportsGitChildProcess) {
    t.skip("git child processes are blocked in this sandbox");
    return;
  }

  const repoDir = createTrackedRepo();
  writeFile(repoDir, "dirty.txt", "change\n");
  assert.throws(() => ensureLoopBaseState("dev", { cwd: repoDir }), /clean worktree/);
});

test("collectChangedFiles includes committed, staged, unstaged, and untracked files", (t) => {
  if (!supportsGitChildProcess) {
    t.skip("git child processes are blocked in this sandbox");
    return;
  }

  const repoDir = createTrackedRepo();
  runCommand("git", ["checkout", "-b", "story/ep0-st003"], { cwd: repoDir });

  writeFile(repoDir, "committed.txt", "commit\n");
  runCommand("git", ["add", "committed.txt"], { cwd: repoDir });
  runCommand("git", ["commit", "-m", "committed"], { cwd: repoDir });

  writeFile(repoDir, "staged.txt", "staged\n");
  runCommand("git", ["add", "staged.txt"], { cwd: repoDir });

  writeFile(repoDir, "README.md", "changed\n");
  writeFile(repoDir, "untracked.txt", "untracked\n");

  const changedFiles = collectChangedFiles("dev", { cwd: repoDir });
  assert.deepEqual(changedFiles, ["README.md", "committed.txt", "staged.txt", "untracked.txt"]);
});

test("mergeStoryBranchIntoDev fast-forwards and leaves repository on dev", (t) => {
  if (!supportsGitChildProcess) {
    t.skip("git child processes are blocked in this sandbox");
    return;
  }

  const repoDir = createTrackedRepo();
  runCommand("git", ["checkout", "-b", "story/ep0-st003"], { cwd: repoDir });
  writeFile(repoDir, "story.txt", "done\n");
  runCommand("git", ["add", "story.txt"], { cwd: repoDir });
  runCommand("git", ["commit", "-m", "story"], { cwd: repoDir });

  mergeStoryBranchIntoDev("story/ep0-st003", { cwd: repoDir });
  assert.equal(getCurrentBranch({ cwd: repoDir }), "dev");
  assert.equal(fs.existsSync(path.join(repoDir, "story.txt")), true);
});

test("runWithRetries honors the retry bound", async () => {
  let attempts = 0;
  let retries = 0;

  await assert.rejects(
    runWithRetries({
      maxRetries: 2,
      run: async () => {
        attempts += 1;
        throw new Error("fail");
      },
      onRetry: async () => {
        retries += 1;
      },
    }),
    /fail/
  );

  assert.equal(attempts, 3);
  assert.equal(retries, 2);
});

test("runCommand forwards input, exposes output, and preserves failure details", (t) => {
  const stdoutChunks = [];
  const stderrChunks = [];
  const originalStdoutWrite = process.stdout.write;
  const originalStderrWrite = process.stderr.write;
  let commandError;

  process.stdout.write = (chunk, encoding, callback) => {
    stdoutChunks.push(String(chunk));
    if (typeof encoding === "function") {
      encoding();
    } else if (typeof callback === "function") {
      callback();
    }
    return true;
  };
  process.stderr.write = (chunk, encoding, callback) => {
    stderrChunks.push(String(chunk));
    if (typeof encoding === "function") {
      encoding();
    } else if (typeof callback === "function") {
      callback();
    }
    return true;
  };

  try {
    runCommand(
      process.execPath,
      [
        "-e",
        `
let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += chunk;
});
process.stdin.on("end", () => {
  process.stdout.write("stdout:" + input);
  process.stderr.write("stderr:visible\\n");
  process.exitCode = 7;
});
`,
      ],
      {
        input: "prompt input\n",
        forwardOutput: true,
      }
    );
  } catch (error) {
    commandError = error;
  } finally {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  }

  if (commandError?.message.includes("EPERM")) {
    t.skip("Node child processes are blocked in this sandbox");
    return;
  }

  assert.equal(commandError?.status, 7);
  assert.equal(commandError?.stdout, "stdout:prompt input\n");
  assert.equal(commandError?.stderr, "stderr:visible\n");
  assert.equal(commandError?.output, "stdout:prompt input\nstderr:visible");
  assert.equal(stdoutChunks.join(""), commandError.stdout);
  assert.equal(stderrChunks.join(""), commandError.stderr);
});

test("runCommand marks timeout failures", (t) => {
  let commandError;

  try {
    runProcessCommand(process.execPath, ["-e", "setTimeout(() => {}, 1000)"], { timeoutMs: 50 });
  } catch (error) {
    commandError = error;
  }

  if (commandError?.message.includes("EPERM")) {
    t.skip("Node child processes are blocked in this sandbox");
    return;
  }

  assert.equal(commandError?.timedOut, true);
  assert.equal(commandError?.timeoutMs, 50);
});

test("phase validation rejects confirmation-only build responses", () => {
  withTempCwd(() => {
    const startedAt = Date.now();
    fs.writeFileSync(PHASE_ARTIFACTS.build.responseFile, "Please confirm and I will continue.");

    assert.throws(
      () =>
        validatePhaseArtifacts({
          phase: "build",
          prompt: "story",
          startedAt,
          commandResult: { command: "codex", args: [], output: "" },
        }),
      /Confirmation-only/
    );
  });
});

test("phase validation rejects missing planning output", () => {
  withTempCwd(() => {
    fs.writeFileSync(PHASE_ARTIFACTS.plan.responseFile, "Plan created.");

    assert.throws(
      () =>
        validatePhaseArtifacts({
          phase: "plan",
          prompt: "\nid: EP0-ST004\n",
          startedAt: Date.now() - 10,
          commandResult: { command: "codex", args: [], output: "" },
        }),
      /Missing required artifact: \.codex-plan\.md/
    );
  });
});

test("phase validation accepts valid completion statuses and plan artifacts", () => {
  withTempCwd(() => {
    const startedAt = Date.now() - 10;
    fs.writeFileSync(PHASE_ARTIFACTS.review.responseFile, "Status: fixed\nRemaining risks: none\n");
    const reviewResult = validatePhaseArtifacts({
      phase: "review",
      prompt: "story",
      startedAt,
      commandResult: { command: "codex", args: [], output: "" },
    });
    assert.equal(reviewResult.status, "fixed");

    fs.writeFileSync(PHASE_ARTIFACTS.plan.responseFile, "Plan completed successfully.");
    fs.writeFileSync(
      ".codex-plan.md",
      `# Implementation Plan: EP0-ST004\n\n## 1. Story ID\nEP0-ST004\n\n## 2. Scope Summary\nA\n\n## 3. Allowed Paths\nA\n\n## 4. Forbidden Paths\nA\n\n## 5. Files Likely to Change\nA\n\n## 6. Implementation Steps\nA\n\n## 7. Verification Steps\nA\n\n## 8. Risks\nA\n`
    );

    const planResult = validatePhaseArtifacts({
      phase: "plan",
      prompt: "\nid: EP0-ST004\n",
      startedAt,
      commandResult: { command: "codex", args: [], output: "" },
    });
    assert.equal(planResult.status, "completed");
  });
});

test("phase validation rejects stale artifacts from earlier runs", () => {
  withTempCwd(() => {
    fs.writeFileSync(PHASE_ARTIFACTS.build.responseFile, "Status: completed\n");
    const staleTime = new Date(Date.now() - 5000);
    fs.utimesSync(PHASE_ARTIFACTS.build.responseFile, staleTime, staleTime);

    assert.throws(
      () =>
        validatePhaseArtifacts({
          phase: "build",
          prompt: "story",
          startedAt: Date.now() - 1000,
          commandResult: { command: "codex", args: [], output: "" },
        }),
      /Stale artifact detected/
    );
  });
});

test("removePhaseArtifacts clears stale response and plan files", () => {
  withTempCwd(() => {
    fs.writeFileSync(PHASE_ARTIFACTS.plan.responseFile, "old response");
    fs.writeFileSync(".codex-plan.md", "old plan");

    removePhaseArtifacts("plan");

    assert.equal(fs.existsSync(PHASE_ARTIFACTS.plan.responseFile), false);
    assert.equal(fs.existsSync(".codex-plan.md"), false);
  });
});

test("blocked child-process exit code maps to a non-retriable blocked error", () => {
  const childError = new CommandError("Command failed with exit code 42: node scripts/codex-runner.mjs debug .codex-debug-task.md", {
    command: "node",
    args: ["scripts/codex-runner.mjs", "debug", ".codex-debug-task.md"],
    status: BLOCKED_EXIT_CODE,
    stdout: "",
    stderr: "",
    output: "Status: blocked\nReason: environment decision",
  });

  const normalized = normalizeChildProcessError(childError, childError.args);

  assert.notEqual(normalized, childError);
  assert.equal(normalized.phase, "debug");
  assert.equal(normalized.status, BLOCKED_EXIT_CODE);
  assert.equal(normalized.blocked, true);
  assert.equal(normalized.retriable, false);
  assert.match(normalized.output, /Status: blocked/);
});

test("blocked contract errors stop retry loops immediately", async () => {
  let attempts = 0;
  let retries = 0;

  await assert.rejects(
    runWithRetries({
      maxRetries: 2,
      run: async () => {
        attempts += 1;
        throw createPhaseContractError({
          phase: "debug",
          reason: "Blocked by environment decision.",
          blocked: true,
        });
      },
      onRetry: async (error) => {
        retries += 1;
        if (error.blocked) {
          throw error;
        }
      },
    }),
    /Blocked by environment decision/
  );

  assert.equal(attempts, 1);
  assert.equal(retries, 1);
});

test("review prompt stays noninteractive and excludes checkpoint skill bodies", (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "englishpath-review-story-"));
  const storyPath = path.join(tempDir, "EP0-ST004.md");
  writeFile(tempDir, "EP0-ST004.md", "---\nid: EP0-ST004\nstatus: in-progress\nallowed_paths:\n  - scripts/**\nforbidden_paths:\n  - apps/**\n---\n");

  fs.writeFileSync(
    ".codex-plan.md",
    "# Implementation Plan\n\n- Review references .agents/skills/bmad-code-review/SKILL.md and .agents/skills/bmad-review-edge-case-hunter/SKILL.md as plain text mentions only.\n"
  );

  let result;
  try {
    result = runCommand("node", ["scripts/create-review-prompt.mjs", storyPath], { cwd: process.cwd() });
  } catch (error) {
    if (error.message.includes("EPERM")) {
      t.skip("Node child processes are blocked in this sandbox");
      return;
    }
    throw error;
  } finally {
    fs.rmSync(".codex-plan.md", { force: true });
  }

  assert.match(result.stdout, /Run non-interactively/);
  assert.match(result.stdout, /Ready-only story-doctor already ran before this story moved to in-progress/);
  assert.match(result.stdout, /# Plan[\s\S]*\.agents\/skills\/bmad-code-review\/SKILL\.md/);
  assert.doesNotMatch(result.stdout, /# Context: \.agents\/skills\/bmad-code-review\/SKILL\.md/);
  assert.doesNotMatch(result.stdout, /# Context: \.agents\/skills\/bmad-review-edge-case-hunter\/SKILL\.md/);
});

test("validateRequiredWorkspaceScripts reports missing workspace typecheck coverage", () => {
  const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), "englishpath-run-checks-"));
  const previousCwd = process.cwd();
  process.chdir(repoDir);

  try {
    writeFile(
      repoDir,
      "apps/api/package.json",
      JSON.stringify({ name: "api", scripts: {} }, null, 2)
    );
    writeFile(
      repoDir,
      "apps/web/package.json",
      JSON.stringify({ name: "web", scripts: { typecheck: "tsc --noEmit" } }, null, 2)
    );

    const failures = validateRequiredWorkspaceScripts([{ command: "pnpm typecheck", script: "typecheck" }]);

    assert.deepEqual(failures, ['Missing required workspace script "typecheck" in apps/api/package.json']);
  } finally {
    process.chdir(previousCwd);
  }
});

test("run-checks exits clearly when a required workspace typecheck script is missing", (t) => {
  const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), "englishpath-run-checks-cli-"));
  writeFile(
    repoDir,
    "package.json",
    JSON.stringify({ name: "root", scripts: { typecheck: "echo ok" } }, null, 2)
  );
  writeFile(
    repoDir,
    "apps/api/package.json",
    JSON.stringify({ name: "api", scripts: {} }, null, 2)
  );
  writeFile(
    repoDir,
    "apps/web/package.json",
    JSON.stringify({ name: "web", scripts: { typecheck: "tsc --noEmit" } }, null, 2)
  );

  const result = spawnSync(process.execPath, [path.resolve("scripts/run-checks.mjs")], {
    cwd: repoDir,
    encoding: "utf8",
  });

  if (result.error?.message.includes("EPERM")) {
    t.skip("Node child processes are blocked in this sandbox");
    return;
  }

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Missing required workspace script "typecheck" in apps\/api\/package\.json/);
  assert.doesNotMatch(result.stdout, /\$ pnpm typecheck/);
});

test("AI request classification and formatting stay structured", () => {
  assert.equal(classifyDecisionCategory("Missing env config blocks the build."), "environment");

  const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), "englishpath-ai-req-"));
  const previousCwd = process.cwd();
  process.chdir(repoDir);

  try {
    const file = createAiRequestFile({
      storyId: "EP0-ST003",
      summary: "Need environment decision",
      evidence: "Missing environment config",
      attempts: "Ran checks twice",
      decisionNeeded: "Confirm required variables",
      impact: "Loop remains blocked",
      category: "environment",
    });

    assert.match(file, /notes[\\/]+ai-req[\\/]+/);
    assert.match(fs.readFileSync(file, "utf8"), /## Decision Needed/);
  } finally {
    process.chdir(previousCwd);
  }
});

