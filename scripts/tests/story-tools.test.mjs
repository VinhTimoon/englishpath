import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  classifyDecisionCategory,
  createAiRequestFile,
} from "../lib/ai-request-utils.mjs";
import {
  collectChangedFiles,
  ensureLoopBaseState,
  getCurrentBranch,
  mergeStoryBranchIntoDev,
} from "../lib/git-utils.mjs";
import { evaluatePathPolicy, matchesGlob } from "../lib/path-policy.mjs";
import {
  acquireLoopLock,
  releaseLoopLock,
  syncSprintStatus,
} from "../lib/harness-state.mjs";
import {
  runChecks,
  runPrismaValidation,
  validateRequiredScripts,
  validateRequiredWorkspaceScripts,
} from "../run-checks.mjs";
import {
  BLOCKED_EXIT_CODE,
  CommandError,
  PHASE_ARTIFACTS,
  createPhaseContractError,
  materializePlanArtifact,
  removePhaseArtifacts,
  resolvePhaseSandbox,
  runCommand,
  runCommand as runProcessCommand,
  validatePhaseArtifacts,
} from "../lib/process-utils.mjs";
import { runWithRetries } from "../lib/retry-utils.mjs";
import {
  normalizeChildProcessError,
  pickStory,
  transitionStory,
} from "../codex-loop.mjs";
import {
  moveStoryToStatus,
  parseFrontmatter,
  validateStory,
} from "../lib/story-utils.mjs";

const supportsGitChildProcess = (() => {
  try {
    runCommand("git", ["--version"]);
    return true;
  } catch {
    return false;
  }
})();

function makeTempRepo() {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "englishpath-story-tools-"),
  );
  runCommand("git", ["init", "-b", "dev"], { cwd: tempDir });
  runCommand("git", ["config", "user.name", "Codex Test"], { cwd: tempDir });
  runCommand("git", ["config", "user.email", "codex@example.com"], {
    cwd: tempDir,
  });
  return tempDir;
}

function writeFile(repoDir, relativePath, content) {
  const target = path.join(repoDir, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

const PROJECT_SKILL_FILES = [
  ".agents/skills/englishpath-backend-nlayer/SKILL.md",
  ".agents/skills/englishpath-frontend-quality/SKILL.md",
  ".agents/skills/englishpath-prisma-supabase/SKILL.md",
  ".agents/skills/englishpath-token-optimizer/SKILL.md",
];

function validateSkillMetadata(content) {
  const { frontmatter, body } = parseFrontmatter(content);
  const issues = [];

  if (typeof frontmatter.name !== "string" || !frontmatter.name.trim()) {
    issues.push("Missing non-empty skill name.");
  }
  if (
    typeof frontmatter.description !== "string" ||
    !frontmatter.description.trim()
  ) {
    issues.push("Missing non-empty skill description.");
  }
  if (!body.trim()) {
    issues.push("Skill instruction body is empty.");
  }

  return issues;
}

function createTrackedRepo() {
  const repoDir = makeTempRepo();
  writeFile(repoDir, "README.md", "base\n");
  runCommand("git", ["add", "."], { cwd: repoDir });
  runCommand("git", ["commit", "-m", "base"], { cwd: repoDir });

  const remoteDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "englishpath-remote-"),
  );
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
`,
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
  assert.deepEqual(parsed.frontmatter.allowed_paths, [
    "scripts/**",
    "stories/**",
  ]);
});

test("EnglishPath project skills contain valid metadata and instruction bodies", () => {
  for (const skillFile of PROJECT_SKILL_FILES) {
    const content = fs.readFileSync(skillFile, "utf8");
    assert.deepEqual(validateSkillMetadata(content), [], skillFile);
  }
});

test("skill metadata validation reports missing required fields", () => {
  const invalidSkill = "---\nname: \ndescription: \n---\n\n# Instructions\n";

  assert.deepEqual(validateSkillMetadata(invalidSkill), [
    "Missing non-empty skill name.",
    "Missing non-empty skill description.",
  ]);
  assert.throws(
    () => validateSkillMetadata("# Instructions\n"),
    /missing frontmatter/i,
  );
});

test("validateStory accepts absolute story paths when lifecycle matches", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "englishpath-story-"));
  const storyPath = path.join(
    tempDir,
    "stories",
    "in-progress",
    "EP0-ST003.md",
  );
  writeStory(
    tempDir,
    path.join("stories", "in-progress", "EP0-ST003.md"),
    "in-progress",
  );

  const result = validateStory(storyPath);
  assert.deepEqual(result.issues, []);
});

test("validateStory enforces lifecycle folder and required structure", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "englishpath-story-"));
  const storyPath = path.join(tempDir, "stories", "ready", "EP0-ST003.md");
  writeStory(
    tempDir,
    path.join("stories", "ready", "EP0-ST003.md"),
    "in-progress",
  );

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
    { ignoredPaths: [".codex-plan.md"] },
  );

  assert.equal(
    result.find((entry) => entry.file === "scripts/lib/test.mjs")?.ok,
    true,
  );
  assert.equal(
    result.find((entry) => entry.file === "apps/api/main.ts")?.ok,
    false,
  );
  assert.match(
    result.find((entry) => entry.file === "apps/api/main.ts")?.reason ?? "",
    /forbidden path pattern/,
  );
});

test("ensureLoopBaseState rejects non-dev branches", (t) => {
  if (!supportsGitChildProcess) {
    t.skip("git child processes are blocked in this sandbox");
    return;
  }

  const repoDir = createTrackedRepo();
  runCommand("git", ["checkout", "-b", "story/ep0-st003"], { cwd: repoDir });
  assert.throws(
    () => ensureLoopBaseState("dev", { cwd: repoDir }),
    /Loop must start on "dev"/,
  );
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
  assert.throws(
    () => ensureLoopBaseState("dev", { cwd: repoDir }),
    /must track an upstream branch/,
  );
});

test("ensureLoopBaseState rejects dirty dev worktrees", (t) => {
  if (!supportsGitChildProcess) {
    t.skip("git child processes are blocked in this sandbox");
    return;
  }

  const repoDir = createTrackedRepo();
  writeFile(repoDir, "dirty.txt", "change\n");
  assert.throws(
    () => ensureLoopBaseState("dev", { cwd: repoDir }),
    /clean worktree/,
  );
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
  assert.deepEqual(changedFiles, [
    "README.md",
    "committed.txt",
    "staged.txt",
    "untracked.txt",
  ]);
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
    /fail/,
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
      },
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
    runProcessCommand(process.execPath, ["-e", "setTimeout(() => {}, 1000)"], {
      timeoutMs: 50,
    });
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
    fs.writeFileSync(
      PHASE_ARTIFACTS.build.responseFile,
      "Please confirm and I will continue.",
    );

    assert.throws(
      () =>
        validatePhaseArtifacts({
          phase: "build",
          prompt: "story",
          startedAt,
          commandResult: { command: "codex", args: [], output: "" },
        }),
      /Confirmation-only/,
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
      /Missing required artifact: \.codex-plan\.md/,
    );
  });
});

test("plan handoff materializes a validated response byte-for-byte", () => {
  withTempCwd(() => {
    const startedAt = Date.now() - 10;
    const prompt = "\nid: EP0-ST011\n";
    const plan = `## 1. Story ID\nEP0-ST011\n\n## 2. Scope Summary\nA\n\n## 3. Allowed Paths\nA\n\n## 4. Forbidden Paths\nA\n\n## 5. Files Likely to Change\nA\n\n## 6. Implementation Steps\nA\n\n## 7. Verification Steps\nA\n\n## 8. Risks\nA\n`;
    fs.writeFileSync(PHASE_ARTIFACTS.plan.responseFile, plan);

    const planFile = materializePlanArtifact({ prompt, startedAt });

    assert.equal(planFile, ".codex-plan.md");
    assert.equal(fs.readFileSync(planFile, "utf8"), plan);
    assert.equal(
      validatePhaseArtifacts({
        phase: "plan",
        prompt,
        startedAt,
        commandResult: { command: "codex", args: [], output: "" },
      }).status,
      "completed",
    );
  });
});

test("plan handoff rejects invalid or stale responses before writing", () => {
  withTempCwd(() => {
    fs.writeFileSync(
      PHASE_ARTIFACTS.plan.responseFile,
      "not a structured plan",
    );
    assert.throws(
      () =>
        materializePlanArtifact({
          prompt: "\nid: EP0-ST011\n",
          startedAt: Date.now() - 10,
        }),
      /missing required sections/i,
    );
    assert.equal(fs.existsSync(".codex-plan.md"), false);
  });

  withTempCwd(() => {
    fs.writeFileSync(PHASE_ARTIFACTS.plan.responseFile, "stale plan");
    const staleTime = new Date(Date.now() - 5000);
    fs.utimesSync(PHASE_ARTIFACTS.plan.responseFile, staleTime, staleTime);
    assert.throws(
      () =>
        materializePlanArtifact({
          prompt: "\nid: EP0-ST011\n",
          startedAt: Date.now() - 1000,
        }),
      /Stale artifact detected/,
    );
    assert.equal(fs.existsSync(".codex-plan.md"), false);
  });
});

test("phase sandbox policy grants full access only to scoped build and debug", () => {
  withTempCwd((tempDir) => {
    writeFile(tempDir, "package.json", '{"name":"englishpath"}\n');
    const scopedPrompt = `id: EP0-ST012
allowed_paths:
  - scripts/**
forbidden_paths:
  - apps/**
`;

    assert.equal(
      resolvePhaseSandbox({
        phase: "plan",
        configuredSandbox: "read-only",
        prompt: "plan",
      }),
      "read-only",
    );
    assert.equal(
      resolvePhaseSandbox({
        phase: "review",
        configuredSandbox: "read-only",
        prompt: "review",
      }),
      "read-only",
    );
    assert.equal(
      resolvePhaseSandbox({
        phase: "build",
        configuredSandbox: "danger-full-access",
        prompt: scopedPrompt,
      }),
      "danger-full-access",
    );
    assert.equal(
      resolvePhaseSandbox({
        phase: "debug",
        configuredSandbox: "danger-full-access",
        prompt: scopedPrompt,
      }),
      "danger-full-access",
    );
  });
});

test("dangerous sandbox phases reject policy, root, and scope violations", () => {
  withTempCwd((tempDir) => {
    writeFile(tempDir, "package.json", '{"name":"englishpath"}\n');

    assert.throws(
      () =>
        resolvePhaseSandbox({
          phase: "deploy",
          configuredSandbox: "danger-full-access",
          prompt: "deploy",
        }),
      /Unknown phase sandbox policy/,
    );
    assert.throws(
      () =>
        resolvePhaseSandbox({
          phase: "build",
          configuredSandbox: "workspace-write",
          prompt: "build",
        }),
      /Sandbox policy mismatch/,
    );
    assert.throws(
      () =>
        resolvePhaseSandbox({
          phase: "review",
          configuredSandbox: "danger-full-access",
          prompt: "review",
        }),
      /Sandbox policy mismatch/,
    );
    assert.throws(
      () =>
        resolvePhaseSandbox({
          phase: "build",
          configuredSandbox: "danger-full-access",
          prompt: "id: EP0-ST012",
        }),
      /missing story scope policy/,
    );

    fs.rmSync(path.join(tempDir, "package.json"));
    assert.throws(
      () =>
        resolvePhaseSandbox({
          phase: "build",
          configuredSandbox: "danger-full-access",
          prompt:
            "id: EP0-ST012\nallowed_paths:\n  - scripts/**\nforbidden_paths:\n  - apps/**\n",
        }),
      /not running from a readable project root/,
    );

    writeFile(tempDir, "package.json", "not json\n");
    assert.throws(
      () =>
        resolvePhaseSandbox({
          phase: "build",
          configuredSandbox: "danger-full-access",
          prompt:
            "id: EP0-ST012\nallowed_paths:\n  - scripts/**\nforbidden_paths:\n  - apps/**\n",
        }),
      /not running from a readable project root/,
    );

    writeFile(tempDir, "package.json", '{"name":"another-project"}\n');
    assert.throws(
      () =>
        resolvePhaseSandbox({
          phase: "debug",
          configuredSandbox: "danger-full-access",
          prompt:
            "id: EP0-ST012\nallowed_paths:\n  - scripts/**\nforbidden_paths:\n  - apps/**\n",
        }),
      /outside the EnglishPath project root/,
    );
  });
});

test("plan handoff requires the expected ID in the Story ID section", () => {
  withTempCwd(() => {
    const plan = `## 1. Story ID
EP0-ST999

## 2. Scope Summary
EP0-ST011 appears here but is not the planned story.

## 3. Allowed Paths
A

## 4. Forbidden Paths
A

## 5. Files Likely to Change
A

## 6. Implementation Steps
A

## 7. Verification Steps
A

## 8. Risks
A
`;
    fs.writeFileSync(PHASE_ARTIFACTS.plan.responseFile, plan);

    assert.throws(
      () =>
        materializePlanArtifact({
          prompt: "\nid: EP0-ST011\n",
          startedAt: Date.now() - 10,
        }),
      /Story ID section must equal EP0-ST011/,
    );
    assert.equal(fs.existsSync(".codex-plan.md"), false);
  });
});

test("planning prompt requires the exact story ID without a title suffix", () => {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "englishpath-plan-prompt-"),
  );
  const storyFile = path.join(tempDir, "story.md");
  fs.writeFileSync(storyFile, "---\nid: EP1-ST047\n---\n# Story\n");

  const result = spawnSync(
    process.execPath,
    ["scripts/create-plan-prompt.mjs", storyFile],
    { cwd: process.cwd(), encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(
    result.stdout,
    /Under `## 1\. Story ID`, write exactly `EP1-ST047` and nothing else\./,
  );
});

test("plan handoff rejects prefaces and unexpected headings", () => {
  const validPlan = `## 1. Story ID\nEP0-ST011\n\n## 2. Scope Summary\nA\n\n## 3. Allowed Paths\nA\n\n## 4. Forbidden Paths\nA\n\n## 5. Files Likely to Change\nA\n\n## 6. Implementation Steps\nA\n\n## 7. Verification Steps\nA\n\n## 8. Risks\nA\n`;

  withTempCwd(() => {
    fs.writeFileSync(
      PHASE_ARTIFACTS.plan.responseFile,
      `Planning complete.\n\n${validPlan}`,
    );
    assert.throws(
      () =>
        materializePlanArtifact({
          prompt: "\nid: EP0-ST011\n",
          startedAt: Date.now() - 10,
        }),
      /contain no preface/i,
    );
    assert.equal(fs.existsSync(".codex-plan.md"), false);
  });

  withTempCwd(() => {
    fs.writeFileSync(
      PHASE_ARTIFACTS.plan.responseFile,
      `${validPlan}\n## 9. Notes\nExtra\n`,
    );
    assert.throws(
      () =>
        materializePlanArtifact({
          prompt: "\nid: EP0-ST011\n",
          startedAt: Date.now() - 10,
        }),
      /unexpected sections/i,
    );
    assert.equal(fs.existsSync(".codex-plan.md"), false);
  });
});

test("phase validation accepts valid completion statuses and plan artifacts", () => {
  withTempCwd(() => {
    const startedAt = Date.now() - 10;
    fs.writeFileSync(
      PHASE_ARTIFACTS.review.responseFile,
      "Status: pass\nRemaining risks: none\n",
    );
    const reviewResult = validatePhaseArtifacts({
      phase: "review",
      prompt: "story",
      startedAt,
      commandResult: { command: "codex", args: [], output: "" },
    });
    assert.equal(reviewResult.status, "pass");

    fs.writeFileSync(
      PHASE_ARTIFACTS.plan.responseFile,
      "Plan completed successfully.",
    );
    fs.writeFileSync(
      ".codex-plan.md",
      `## 1. Story ID\nEP0-ST004\n\n## 2. Scope Summary\nA\n\n## 3. Allowed Paths\nA\n\n## 4. Forbidden Paths\nA\n\n## 5. Files Likely to Change\nA\n\n## 6. Implementation Steps\nA\n\n## 7. Verification Steps\nA\n\n## 8. Risks\nA\n`,
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

test("read-only review validation rejects legacy fixed status", () => {
  withTempCwd(() => {
    const startedAt = Date.now() - 10;
    fs.writeFileSync(
      PHASE_ARTIFACTS.review.responseFile,
      "Status: fixed\nRemaining risks: none\n",
    );

    assert.throws(
      () =>
        validatePhaseArtifacts({
          phase: "review",
          prompt: "story",
          startedAt,
          commandResult: { command: "codex", args: [], output: "" },
        }),
      /Expected one of: pass, blocked/,
    );
  });
});

test("phase validation accepts plan headings with different capitalization", () => {
  withTempCwd(() => {
    const startedAt = Date.now() - 10;
    fs.writeFileSync(
      PHASE_ARTIFACTS.plan.responseFile,
      "Plan completed successfully.",
    );
    fs.writeFileSync(
      ".codex-plan.md",
      `## 1. Story id\nEP0-ST010\n\n## 2. Scope summary\nA\n\n## 3. Allowed paths\nA\n\n## 4. Forbidden paths\nA\n\n## 5. Files likely to change\nA\n\n## 6. Implementation steps\nA\n\n## 7. Verification steps\nA\n\n## 8. Risks\nA\n`,
    );

    const result = validatePhaseArtifacts({
      phase: "plan",
      prompt: "\nid: EP0-ST010\n",
      startedAt,
      commandResult: { command: "codex", args: [], output: "" },
    });

    assert.equal(result.status, "completed");
  });
});

test("phase validation rejects duplicated or out-of-order plan sections", () => {
  withTempCwd(() => {
    const startedAt = Date.now() - 10;
    fs.writeFileSync(
      PHASE_ARTIFACTS.plan.responseFile,
      "Plan completed successfully.",
    );
    fs.writeFileSync(
      ".codex-plan.md",
      `# Plan EP0-ST010\n\n## 1. Story ID\nEP0-ST010\n\n## 3. Allowed Paths\nA\n\n## 2. Scope Summary\nA\n\n## 3. Allowed Paths\nA\n\n## 4. Forbidden Paths\nA\n\n## 5. Files Likely to Change\nA\n\n## 6. Implementation Steps\nA\n\n## 7. Verification Steps\nA\n\n## 8. Risks\nA\n`,
    );

    assert.throws(
      () =>
        validatePhaseArtifacts({
          phase: "plan",
          prompt: "\nid: EP0-ST010\n",
          startedAt,
          commandResult: { command: "codex", args: [], output: "" },
        }),
      /duplicated required sections/,
    );
  });

  withTempCwd(() => {
    const startedAt = Date.now() - 10;
    fs.writeFileSync(
      PHASE_ARTIFACTS.plan.responseFile,
      "Plan completed successfully.",
    );
    fs.writeFileSync(
      ".codex-plan.md",
      `# Plan EP0-ST010\n\n## 1. Story ID\nEP0-ST010\n\n## 3. Allowed Paths\nA\n\n## 2. Scope Summary\nA\n\n## 4. Forbidden Paths\nA\n\n## 5. Files Likely to Change\nA\n\n## 6. Implementation Steps\nA\n\n## 7. Verification Steps\nA\n\n## 8. Risks\nA\n`,
    );

    assert.throws(
      () =>
        validatePhaseArtifacts({
          phase: "plan",
          prompt: "\nid: EP0-ST010\n",
          startedAt,
          commandResult: { command: "codex", args: [], output: "" },
        }),
      /out of order/,
    );
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
      /Stale artifact detected/,
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
  const childError = new CommandError(
    "Command failed with exit code 42: node scripts/codex-runner.mjs debug .codex-debug-task.md",
    {
      command: "node",
      args: ["scripts/codex-runner.mjs", "debug", ".codex-debug-task.md"],
      status: BLOCKED_EXIT_CODE,
      stdout: "",
      stderr: "",
      output: "Status: blocked\nReason: environment decision",
    },
  );

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
    /Blocked by environment decision/,
  );

  assert.equal(attempts, 1);
  assert.equal(retries, 1);
});

test("review prompt stays noninteractive and excludes checkpoint skill bodies", (t) => {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "englishpath-review-story-"),
  );
  const storyPath = path.join(tempDir, "EP0-ST004.md");
  writeFile(
    tempDir,
    "EP0-ST004.md",
    "---\nid: EP0-ST004\nstatus: in-progress\nallowed_paths:\n  - scripts/**\nforbidden_paths:\n  - apps/**\n---\n",
  );

  fs.writeFileSync(
    ".codex-plan.md",
    "# Implementation Plan\n\n- Review references .agents/skills/bmad-code-review/SKILL.md and .agents/skills/bmad-review-edge-case-hunter/SKILL.md as plain text mentions only.\n",
  );

  let result;
  try {
    result = runCommand(
      "node",
      ["scripts/create-review-prompt.mjs", storyPath],
      { cwd: process.cwd() },
    );
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
  assert.match(
    result.stdout,
    /Do not load or follow additional workflow skill files/,
  );
  assert.match(
    result.stdout,
    /Do not rerun test or build commands that require writes/,
  );
  assert.match(result.stdout, /Status: pass \| blocked/);
  assert.match(
    result.stdout,
    /Ready-only story-doctor already ran before this story moved to in-progress/,
  );
  assert.match(
    result.stdout,
    /# Plan[\s\S]*\.agents\/skills\/bmad-code-review\/SKILL\.md/,
  );
  assert.doesNotMatch(
    result.stdout,
    /# Context: \.agents\/skills\/bmad-code-review\/SKILL\.md/,
  );
  assert.doesNotMatch(
    result.stdout,
    /# Context: \.agents\/skills\/bmad-review-edge-case-hunter\/SKILL\.md/,
  );
});

test("validateRequiredWorkspaceScripts reports missing workspace typecheck coverage", () => {
  const repoDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "englishpath-run-checks-"),
  );
  const previousCwd = process.cwd();
  process.chdir(repoDir);

  try {
    writeFile(
      repoDir,
      "apps/api/package.json",
      JSON.stringify({ name: "api", scripts: {} }, null, 2),
    );
    writeFile(
      repoDir,
      "apps/web/package.json",
      JSON.stringify(
        { name: "web", scripts: { typecheck: "tsc --noEmit" } },
        null,
        2,
      ),
    );

    const failures = validateRequiredWorkspaceScripts([
      { command: "pnpm typecheck", script: "typecheck" },
    ]);

    assert.deepEqual(failures, [
      'Missing required workspace script "typecheck" in apps/api/package.json',
    ]);
  } finally {
    process.chdir(previousCwd);
  }
});

test("validateRequiredScripts reports missing root browser gate scripts", () => {
  const repoDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "englishpath-root-checks-"),
  );
  const previousCwd = process.cwd();
  process.chdir(repoDir);

  try {
    writeFile(
      repoDir,
      "package.json",
      JSON.stringify(
        { name: "englishpath", scripts: { build: "turbo build" } },
        null,
        2,
      ),
    );

    const failures = validateRequiredScripts([
      { command: "pnpm build", script: "build" },
      { command: "pnpm e2e", script: "e2e" },
    ]);

    assert.deepEqual(failures, [
      'Missing required script "e2e" in package.json',
      'Missing required script "e2e:install" in package.json',
    ]);
  } finally {
    process.chdir(previousCwd);
  }
});

test("validateRequiredWorkspaceScripts requires the API e2e quality task", () => {
  const repoDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "englishpath-e2e-checks-"),
  );
  const previousCwd = process.cwd();
  process.chdir(repoDir);

  try {
    writeFile(
      repoDir,
      "apps/api/package.json",
      JSON.stringify({ name: "api", scripts: {} }, null, 2),
    );

    const failures = validateRequiredWorkspaceScripts([
      {
        command: "pnpm --filter api test:e2e",
        script: "test:e2e",
        packageJson: "apps/api/package.json",
      },
    ]);

    assert.deepEqual(failures, [
      'Missing required workspace script "test:e2e" in apps/api/package.json',
    ]);
  } finally {
    process.chdir(previousCwd);
  }
});

test("runChecks executes a workspace-scoped e2e command from its package manifest", () => {
  const repoDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "englishpath-e2e-runner-"),
  );
  const previousCwd = process.cwd();
  const commands = [];
  process.chdir(repoDir);

  try {
    writeFile(
      repoDir,
      "package.json",
      JSON.stringify(
        {
          name: "englishpath",
          scripts: { "e2e:install": "playwright install chromium" },
        },
        null,
        2,
      ),
    );
    writeFile(
      repoDir,
      "apps/api/package.json",
      JSON.stringify({ name: "api", scripts: { "test:e2e": "jest" } }, null, 2),
    );

    runChecks(
      [
        {
          command: "pnpm --filter api test:e2e",
          script: "test:e2e",
          packageJson: "apps/api/package.json",
        },
      ],
      {
        execute: (command) => commands.push(command),
      },
    );

    assert.deepEqual(commands, ["pnpm --filter api test:e2e"]);
  } finally {
    process.chdir(previousCwd);
  }
});

test("runChecks preserves the planning, tooling, Prisma, and quality gate order", () => {
  const repoDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "englishpath-check-order-"),
  );
  const previousCwd = process.cwd();
  const commands = [];
  process.chdir(repoDir);

  try {
    writeFile(
      repoDir,
      "package.json",
      JSON.stringify(
        {
          name: "englishpath",
          scripts: {
            "format:check": "echo format",
            "planning:traceability": "echo traceability",
            "tool:test": "echo tools",
            "prisma:validate": "echo prisma",
            lint: "echo lint",
            typecheck: "echo typecheck",
            test: "echo test",
            build: "echo build",
            "e2e:install": "playwright install chromium",
            e2e: "playwright test",
          },
        },
        null,
        2,
      ),
    );
    writeFile(
      repoDir,
      "apps/api/package.json",
      JSON.stringify(
        {
          name: "api",
          scripts: {
            typecheck: "tsc --noEmit",
            "test:e2e": "jest --config test/jest-e2e.json",
          },
        },
        null,
        2,
      ),
    );
    writeFile(
      repoDir,
      "apps/web/package.json",
      JSON.stringify(
        { name: "web", scripts: { typecheck: "tsc --noEmit" } },
        null,
        2,
      ),
    );

    runChecks(undefined, {
      execute: (command) => commands.push(command),
    });

    assert.deepEqual(commands, [
      "pnpm format:check",
      "pnpm planning:traceability",
      "pnpm tool:test",
      "pnpm prisma:validate",
      "pnpm lint",
      "pnpm typecheck",
      "pnpm test",
      "pnpm --filter api test:e2e",
      "pnpm build",
      "pnpm e2e",
    ]);
  } finally {
    process.chdir(previousCwd);
  }
});

test("runChecks exits before execution when the root browser gate is missing", (t) => {
  const repoDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "englishpath-run-checks-e2e-cli-"),
  );
  writeFile(
    repoDir,
    "package.json",
    JSON.stringify(
      {
        name: "root",
        scripts: {
          "format:check": "echo format",
          "planning:traceability": "echo traceability",
          "tool:test": "echo tools",
          "prisma:validate": "echo prisma",
          lint: "echo lint",
          typecheck: "echo typecheck",
          test: "echo test",
          build: "echo build",
        },
      },
      null,
      2,
    ),
  );
  writeFile(
    repoDir,
    "apps/api/package.json",
    JSON.stringify(
      {
        name: "api",
        scripts: {
          typecheck: "tsc --noEmit",
          "test:e2e": "jest --config test/jest-e2e.json",
        },
      },
      null,
      2,
    ),
  );
  writeFile(
    repoDir,
    "apps/web/package.json",
    JSON.stringify(
      { name: "web", scripts: { typecheck: "tsc --noEmit" } },
      null,
      2,
    ),
  );

  const result = spawnSync(
    process.execPath,
    [path.resolve("scripts/run-checks.mjs")],
    {
      cwd: repoDir,
      encoding: "utf8",
    },
  );

  if (result.error?.message.includes("EPERM")) {
    t.skip("Node child processes are blocked in this sandbox");
    return;
  }

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Missing required script "e2e" in package\.json/);
  assert.doesNotMatch(result.stdout, /\$ pnpm build/);
  assert.doesNotMatch(result.stdout, /\$ pnpm e2e/);
});

test("runPrismaValidation is validation-only and uses a synthetic local URL", () => {
  let invocation;

  runPrismaValidation({
    execute: (command, options) => {
      invocation = { command, options };
    },
  });

  assert.equal(
    invocation.command,
    "pnpm --dir apps/api exec prisma validate --schema prisma/schema.prisma",
  );
  assert.match(invocation.options.env.DATABASE_URL, /127\.0\.0\.1:5432/);
  assert.doesNotMatch(
    invocation.command,
    /migrate|reset|seed|introspect|db\s+push/i,
  );
});

test("run-checks exits clearly when a required workspace typecheck script is missing", (t) => {
  const repoDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "englishpath-run-checks-cli-"),
  );
  writeFile(
    repoDir,
    "package.json",
    JSON.stringify(
      { name: "root", scripts: { typecheck: "echo ok" } },
      null,
      2,
    ),
  );
  writeFile(
    repoDir,
    "apps/api/package.json",
    JSON.stringify({ name: "api", scripts: {} }, null, 2),
  );
  writeFile(
    repoDir,
    "apps/web/package.json",
    JSON.stringify(
      { name: "web", scripts: { typecheck: "tsc --noEmit" } },
      null,
      2,
    ),
  );

  const result = spawnSync(
    process.execPath,
    [path.resolve("scripts/run-checks.mjs")],
    {
      cwd: repoDir,
      encoding: "utf8",
    },
  );

  if (result.error?.message.includes("EPERM")) {
    t.skip("Node child processes are blocked in this sandbox");
    return;
  }

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /Missing required workspace script "typecheck" in apps\/api\/package\.json/,
  );
  assert.doesNotMatch(result.stdout, /\$ pnpm typecheck/);
});

test("AI request classification and formatting stay structured", () => {
  assert.equal(
    classifyDecisionCategory("Missing env config blocks the build."),
    "environment",
  );

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

test("loop lock rejects a live owner and releases only its own token", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "englishpath-loop-lock-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const lockFile = path.join(dir, ".codex-loop.lock");
  const lock = acquireLoopLock({ lockFile, pid: 101, isAlive: () => true });
  assert.throws(
    () => acquireLoopLock({ lockFile, pid: 202, isAlive: () => true }),
    /Another story loop owns/,
  );
  assert.equal(releaseLoopLock({ lockFile, token: "wrong" }), false);
  assert.equal(lock.release(), true);
  assert.equal(fs.existsSync(lockFile), false);
});

test("loop lock recovers malformed and stale owners", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "englishpath-stale-lock-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const lockFile = path.join(dir, ".codex-loop.lock");
  fs.writeFileSync(lockFile, "not-json");
  const malformedRecovery = acquireLoopLock({
    lockFile,
    pid: 303,
    isAlive: () => false,
    malformedGraceMs: 0,
  });
  malformedRecovery.release();
  fs.mkdirSync(lockFile);
  fs.writeFileSync(
    path.join(lockFile, "owner.json"),
    JSON.stringify({ pid: 404, token: "stale" }),
  );
  const staleRecovery = acquireLoopLock({
    lockFile,
    pid: 505,
    isAlive: () => false,
  });
  assert.equal(staleRecovery.release(), true);
});

test("sprint sync preserves structure and maps blocked to in-progress", (t) => {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), "englishpath-sprint-sync-"),
  );
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const statusFile = path.join(dir, "sprint-status.yaml");
  fs.writeFileSync(
    statusFile,
    "# last_updated: old\nlast_updated: old\ndevelopment_status:\n  1-18-vocabulary-srs: ready-for-dev\n  epic-1-retrospective: optional\n",
  );
  const now = () => new Date("2026-07-19T03:00:00.000Z");
  assert.equal(
    syncSprintStatus({
      storyId: "EP1-ST018",
      status: "in-progress",
      statusFile,
      now,
    }),
    "in-progress",
  );
  assert.equal(
    syncSprintStatus({
      storyId: "EP1-ST018",
      status: "blocked",
      statusFile,
      now,
    }),
    "in-progress",
  );
  const result = fs.readFileSync(statusFile, "utf8");
  assert.match(result, /# last_updated: 2026-07-19T03:00:00.000Z/);
  assert.match(result, /^last_updated: 2026-07-19T03:00:00.000Z$/m);
  assert.match(result, /  1-18-vocabulary-srs: in-progress/);
  assert.match(result, /epic-1-retrospective: optional/);
});

test("sprint sync fails for missing files and story keys", (t) => {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), "englishpath-sprint-missing-"),
  );
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const missing = path.join(dir, "missing.yaml");
  assert.throws(
    () =>
      syncSprintStatus({
        storyId: "EP1-ST018",
        status: "review",
        statusFile: missing,
      }),
    /not found/,
  );
  const statusFile = path.join(dir, "sprint-status.yaml");
  fs.writeFileSync(
    statusFile,
    "# last_updated: old\nlast_updated: old\ndevelopment_status:\n  1-17-vocabulary: done\n",
  );
  assert.throws(
    () =>
      syncSprintStatus({ storyId: "EP1-ST018", status: "review", statusFile }),
    /found 0/,
  );
});

test("fresh malformed locks are treated as initializing owners", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "englishpath-fresh-lock-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const lockFile = path.join(dir, ".codex-loop.lock");
  fs.mkdirSync(lockFile);
  assert.throws(() => acquireLoopLock({ lockFile }), /initializing/);
});

test("pickStory returns without terminating when the ready queue is empty", (t) => {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), "englishpath-empty-ready-"),
  );
  const previousCwd = process.cwd();
  t.after(() => {
    process.chdir(previousCwd);
    fs.rmSync(dir, { recursive: true, force: true });
  });
  process.chdir(dir);
  assert.equal(pickStory(), null);
});

test("sprint sync requires both last_updated representations", (t) => {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), "englishpath-sprint-time-"),
  );
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const statusFile = path.join(dir, "sprint-status.yaml");
  fs.writeFileSync(
    statusFile,
    "last_updated: old\ndevelopment_status:\n  1-18-vocabulary: backlog\n",
  );
  assert.throws(
    () =>
      syncSprintStatus({ storyId: "EP1-ST018", status: "review", statusFile }),
    /last_updated comment/,
  );
});

test("transitionStory validates sprint state before moving and rolls back move failures", () => {
  let moved = false;
  assert.throws(
    () =>
      transitionStory("stories/ready/example.md", "in-progress", "EP1-ST018", {
        sync: () => {
          throw new Error("missing sprint key");
        },
        move: () => {
          moved = true;
        },
      }),
    /missing sprint key/,
  );
  assert.equal(moved, false);

  const statuses = [];
  assert.throws(
    () =>
      transitionStory("stories/ready/example.md", "in-progress", "EP1-ST018", {
        sync: ({ status }) => statuses.push(status),
        move: () => {
          throw new Error("move failed");
        },
      }),
    /move failed/,
  );
  assert.deepEqual(statuses, ["in-progress", "ready"]);
});
