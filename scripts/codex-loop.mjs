import fs from "node:fs";

import {
  classifyDecisionCategory,
  createAiRequestFile,
} from "./lib/ai-request-utils.mjs";
import {
  checkoutNewBranch,
  commit,
  ensureLoopBaseState,
  mergeStoryBranchIntoDev,
  stageAll,
} from "./lib/git-utils.mjs";
import { acquireLoopLock, syncSprintStatus } from "./lib/harness-state.mjs";
import {
  BLOCKED_EXIT_CODE,
  createPhaseContractError,
  formatCommand,
  isBlockedExitStatus,
  runCommand,
} from "./lib/process-utils.mjs";
import { runWithRetries } from "./lib/retry-utils.mjs";
import {
  STORY_LIFECYCLE_DIRS,
  ensureDir,
  findStoryFile,
  getExpectedStatusForPath,
  moveStoryToStatus,
  parseStoryFile,
} from "./lib/story-utils.mjs";

const READY_DIR = STORY_LIFECYCLE_DIRS.ready;
const REVIEW_DIR = STORY_LIFECYCLE_DIRS.review;
const BLOCKED_DIR = STORY_LIFECYCLE_DIRS.blocked;
const DEBUG_PROMPT_FILE = ".codex-debug-task.md";
const DEBUG_FAILURE_LOG = ".codex-debug-failure.log";
const LOOP_BASE_BRANCH = "dev";

export function pickStory() {
  ensureDir(READY_DIR);
  const files = fs
    .readdirSync(READY_DIR)
    .filter((file) => file.endsWith(".md"))
    .sort();
  if (files.length === 0) {
    console.log("No ready stories.");
    return null;
  }
  return `${READY_DIR}/${files[0]}`;
}

export function normalizeChildProcessError(error, args) {
  if (!isBlockedExitStatus(error.status)) {
    return error;
  }

  return createPhaseContractError({
    phase: args[1] ?? "child-process",
    reason: `Child process returned blocked exit code ${BLOCKED_EXIT_CODE}.`,
    evidence: error.output || error.message,
    output: error.output,
    status: error.status,
    blocked: true,
    command: error.command || "node",
    args: error.args || args,
  });
}

function executeNodeScript(args) {
  try {
    return runCommand("node", args, { printCommand: true, stdio: "inherit" });
  } catch (error) {
    throw normalizeChildProcessError(error, args);
  }
}

function writePromptFromScript(scriptName, args, promptFile) {
  const result = runCommand("node", [scriptName, ...args], {
    printCommand: true,
  });
  fs.writeFileSync(promptFile, result.stdout);
}

function appendBlockedReport(storyFile, report) {
  fs.appendFileSync(
    storyFile,
    `\n## Blocked Report\n\n- Failed step: ${report.failedStep}\n- Exit code: ${report.exitCode}\n- Attempts: ${report.attempts}\n- Summary: ${report.summary}\n\n### Evidence\n\n\`\`\`text\n${report.failureOutput.trim()}\n\`\`\`\n`,
  );
}

function createDebugPrompt(storyFile, failedStep, failureOutput) {
  fs.writeFileSync(DEBUG_FAILURE_LOG, failureOutput);
  writePromptFromScript(
    "scripts/create-debug-prompt.mjs",
    [storyFile, failedStep, DEBUG_FAILURE_LOG],
    DEBUG_PROMPT_FILE,
  );
}

async function runGateWithDebug({
  storyFile,
  label,
  gateCommand,
  maxFixRounds,
}) {
  return runWithRetries({
    maxRetries: maxFixRounds,
    run: () => gateCommand(),
    onRetry: async (error, retryNumber, retryLimit) => {
      if (error.blocked || error.retriable === false) {
        throw error;
      }

      const output = error.output || error.message;
      console.error(`\nGate failed: ${label}`);
      if (output) {
        console.error(output);
      }

      console.log(
        `\nRetrying ${label} with debug phase (${retryNumber}/${retryLimit}).`,
      );
      createDebugPrompt(storyFile, label, output || "Unknown failure");

      try {
        executeNodeScript([
          "scripts/codex-runner.mjs",
          "debug",
          DEBUG_PROMPT_FILE,
        ]);
      } catch (debugError) {
        if (debugError.blocked || debugError.retriable === false) {
          throw debugError;
        }
        throw createPhaseContractError({
          phase: "debug",
          reason:
            "Debug phase did not produce a terminal fix or blocked result.",
          evidence: debugError.output || debugError.message,
          output,
          command: debugError.command || "node",
          args: debugError.args || [
            "scripts/codex-runner.mjs",
            "debug",
            DEBUG_PROMPT_FILE,
          ],
        });
      }
    },
  });
}

export function transitionStory(
  storyFile,
  status,
  storyId,
  { sync = syncSprintStatus, move = moveStoryToStatus } = {},
) {
  const previousStatus = getExpectedStatusForPath(storyFile);
  sync({ storyId, status });
  try {
    return move(storyFile, status);
  } catch (error) {
    try {
      sync({ storyId, status: previousStatus });
    } catch (rollbackError) {
      error.message += ` Sprint rollback also failed: ${rollbackError.message}`;
    }
    throw error;
  }
}

async function main() {
  ensureDir(REVIEW_DIR);
  ensureDir(BLOCKED_DIR);
  ensureLoopBaseState(LOOP_BASE_BRANCH);

  const storyFile = pickStory();
  if (!storyFile) return;
  executeNodeScript(["scripts/story-doctor.mjs", storyFile, "--ready-only"]);

  const story = parseStoryFile(storyFile);
  const storyId = story.frontmatter.id;
  const branch = `story/${storyId.toLowerCase()}`;
  const maxFixRounds = story.frontmatter.max_fix_rounds;
  let activeStory = storyFile;

  console.log(`Picked story: ${storyFile}`);
  console.log(`Story id: ${storyId}`);
  console.log(`Branch: ${branch}`);

  try {
    checkoutNewBranch(branch);
    activeStory = transitionStory(storyFile, "in-progress", storyId);

    writePromptFromScript(
      "scripts/create-plan-prompt.mjs",
      [activeStory],
      ".codex-plan-task.md",
    );
    executeNodeScript([
      "scripts/codex-runner.mjs",
      "plan",
      ".codex-plan-task.md",
    ]);
    writePromptFromScript(
      "scripts/create-build-prompt.mjs",
      [activeStory],
      ".codex-build-task.md",
    );
    await runGateWithDebug({
      storyFile: activeStory,
      label: "build phase",
      gateCommand: () =>
        executeNodeScript([
          "scripts/codex-runner.mjs",
          "build",
          ".codex-build-task.md",
        ]),
      maxFixRounds,
    });
    await runGateWithDebug({
      storyFile: activeStory,
      label: "checks",
      gateCommand: () => executeNodeScript(["scripts/run-checks.mjs"]),
      maxFixRounds,
    });
    writePromptFromScript(
      "scripts/create-review-prompt.mjs",
      [activeStory],
      ".codex-review-task.md",
    );
    await runGateWithDebug({
      storyFile: activeStory,
      label: "review phase",
      gateCommand: () =>
        executeNodeScript([
          "scripts/codex-runner.mjs",
          "review",
          ".codex-review-task.md",
        ]),
      maxFixRounds,
    });
    await runGateWithDebug({
      storyFile: activeStory,
      label: "checks",
      gateCommand: () => executeNodeScript(["scripts/run-checks.mjs"]),
      maxFixRounds,
    });
    await runGateWithDebug({
      storyFile: activeStory,
      label: "story verification",
      gateCommand: () =>
        executeNodeScript(["scripts/verify-story.mjs", activeStory]),
      maxFixRounds,
    });

    const reviewStory = transitionStory(activeStory, "review", storyId);
    stageAll();
    commit(`${storyId}: complete story`);
    mergeStoryBranchIntoDev(branch);
    console.log("\nLoop completed.");
    console.log(`Story moved to review: ${reviewStory}`);
    console.log('Story branch was fast-forward merged into "dev".');
  } catch (error) {
    console.error("\nLoop failed. Recording blocked evidence.");
    const currentStoryFile = findStoryFile(story.fileName) ?? activeStory;
    let evidenceStory = currentStoryFile;
    let transitionError = null;
    try {
      evidenceStory = transitionStory(currentStoryFile, "blocked", storyId);
    } catch (syncError) {
      transitionError = syncError;
    }
    const originalOutput = error.output || error.message || "Unknown failure";
    const failureOutput = transitionError
      ? `${originalOutput}\nHarness state transition failed: ${transitionError.message}`
      : originalOutput;
    const category = classifyDecisionCategory(failureOutput);
    appendBlockedReport(evidenceStory, {
      failedStep: error.command
        ? formatCommand(error.command, error.args)
        : "loop",
      exitCode: error.status ?? 1,
      attempts: error.blocked ? 1 : maxFixRounds + 1,
      summary: transitionError
        ? "The loop failed and its blocked transition could not be synchronized; evidence was preserved on the current story."
        : error.blocked
          ? "The automated loop produced a valid blocked outcome and stopped without further retries."
          : "The automated loop could not complete this story.",
      failureOutput,
    });
    if (category) {
      const aiRequestFile = createAiRequestFile({
        storyId,
        summary: `Story blocked by ${category} decision.`,
        evidence: failureOutput,
        attempts: `Loop attempted the failing gate up to ${error.blocked ? 1 : maxFixRounds + 1} times.`,
        decisionNeeded: `Resolve the ${category} blocker so ${storyId} can continue.`,
        impact: "The story remains blocked and cannot be merged into dev.",
        category,
      });
      console.error(`Created AI request: ${aiRequestFile}`);
    }
    stageAll();
    commit(`${storyId}: blocked by loop`);
    process.exitCode = 1;
  }
}
const isDirectRun =
  process.argv[1] &&
  new URL(import.meta.url).pathname.endsWith(
    process.argv[1].replace(/\\/g, "/"),
  );

if (isDirectRun) {
  const loopLock = acquireLoopLock();
  try {
    await main();
  } finally {
    loopLock.release();
  }
}
