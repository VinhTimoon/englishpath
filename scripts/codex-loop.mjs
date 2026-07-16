import fs from "node:fs";

import { classifyDecisionCategory, createAiRequestFile } from "./lib/ai-request-utils.mjs";
import { checkoutNewBranch, commit, ensureLoopBaseState, mergeStoryBranchIntoDev, stageAll } from "./lib/git-utils.mjs";
import { BLOCKED_EXIT_CODE, createPhaseContractError, formatCommand, isBlockedExitStatus, runCommand } from "./lib/process-utils.mjs";
import { runWithRetries } from "./lib/retry-utils.mjs";
import { STORY_LIFECYCLE_DIRS, ensureDir, findStoryFile, moveStoryToStatus, parseStoryFile } from "./lib/story-utils.mjs";

const READY_DIR = STORY_LIFECYCLE_DIRS.ready;
const REVIEW_DIR = STORY_LIFECYCLE_DIRS.review;
const BLOCKED_DIR = STORY_LIFECYCLE_DIRS.blocked;
const DEBUG_PROMPT_FILE = ".codex-debug-task.md";
const DEBUG_FAILURE_LOG = ".codex-debug-failure.log";
const LOOP_BASE_BRANCH = "dev";

function pickStory() {
  ensureDir(READY_DIR);
  const files = fs.readdirSync(READY_DIR).filter((file) => file.endsWith(".md")).sort();
  if (files.length === 0) {
    console.log("No ready stories.");
    process.exit(0);
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
  const result = runCommand("node", [scriptName, ...args], { printCommand: true });
  fs.writeFileSync(promptFile, result.stdout);
}

function appendBlockedReport(storyFile, report) {
  fs.appendFileSync(
    storyFile,
    `\n## Blocked Report\n\n- Failed step: ${report.failedStep}\n- Exit code: ${report.exitCode}\n- Attempts: ${report.attempts}\n- Summary: ${report.summary}\n\n### Evidence\n\n\`\`\`text\n${report.failureOutput.trim()}\n\`\`\`\n`
  );
}

function createDebugPrompt(storyFile, failedStep, failureOutput) {
  fs.writeFileSync(DEBUG_FAILURE_LOG, failureOutput);
  writePromptFromScript("scripts/create-debug-prompt.mjs", [storyFile, failedStep, DEBUG_FAILURE_LOG], DEBUG_PROMPT_FILE);
}

async function runGateWithDebug({ storyFile, label, gateCommand, maxFixRounds }) {
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

      console.log(`\nRetrying ${label} with debug phase (${retryNumber}/${retryLimit}).`);
      createDebugPrompt(storyFile, label, output || "Unknown failure");

      try {
        executeNodeScript(["scripts/codex-runner.mjs", "debug", DEBUG_PROMPT_FILE]);
      } catch (debugError) {
        if (debugError.blocked || debugError.retriable === false) {
          throw debugError;
        }
        throw createPhaseContractError({
          phase: "debug",
          reason: "Debug phase did not produce a terminal fix or blocked result.",
          evidence: debugError.output || debugError.message,
          output,
          command: debugError.command || "node",
          args: debugError.args || ["scripts/codex-runner.mjs", "debug", DEBUG_PROMPT_FILE],
        });
      }
    },
  });
}

async function main() {
  ensureDir(REVIEW_DIR);
  ensureDir(BLOCKED_DIR);

  ensureLoopBaseState(LOOP_BASE_BRANCH);

  const storyFile = pickStory();
  executeNodeScript(["scripts/story-doctor.mjs", storyFile, "--ready-only"]);

  const story = parseStoryFile(storyFile);
  const storyId = story.frontmatter.id;
  const branch = `story/${storyId.toLowerCase()}`;
  const maxFixRounds = story.frontmatter.max_fix_rounds;

  console.log(`Picked story: ${storyFile}`);
  console.log(`Story id: ${storyId}`);
  console.log(`Branch: ${branch}`);

  checkoutNewBranch(branch);
  const inProgressStory = moveStoryToStatus(storyFile, "in-progress");

  try {
    writePromptFromScript("scripts/create-plan-prompt.mjs", [inProgressStory], ".codex-plan-task.md");
    executeNodeScript(["scripts/codex-runner.mjs", "plan", ".codex-plan-task.md"]);

    writePromptFromScript("scripts/create-build-prompt.mjs", [inProgressStory], ".codex-build-task.md");
    await runGateWithDebug({
      storyFile: inProgressStory,
      label: "build phase",
      gateCommand: () => executeNodeScript(["scripts/codex-runner.mjs", "build", ".codex-build-task.md"]),
      maxFixRounds,
    });

    await runGateWithDebug({
      storyFile: inProgressStory,
      label: "checks",
      gateCommand: () => executeNodeScript(["scripts/run-checks.mjs"]),
      maxFixRounds,
    });

    writePromptFromScript("scripts/create-review-prompt.mjs", [inProgressStory], ".codex-review-task.md");
    await runGateWithDebug({
      storyFile: inProgressStory,
      label: "review phase",
      gateCommand: () => executeNodeScript(["scripts/codex-runner.mjs", "review", ".codex-review-task.md"]),
      maxFixRounds,
    });

    await runGateWithDebug({
      storyFile: inProgressStory,
      label: "checks",
      gateCommand: () => executeNodeScript(["scripts/run-checks.mjs"]),
      maxFixRounds,
    });

    await runGateWithDebug({
      storyFile: inProgressStory,
      label: "story verification",
      gateCommand: () => executeNodeScript(["scripts/verify-story.mjs", inProgressStory]),
      maxFixRounds,
    });

    const reviewStory = moveStoryToStatus(inProgressStory, "review");
    stageAll();
    commit(`${storyId}: complete story`);
    mergeStoryBranchIntoDev(branch);

    console.log("");
    console.log("Loop completed.");
    console.log(`Story moved to review: ${reviewStory}`);
    console.log('Story branch was fast-forward merged into "dev".');
  } catch (error) {
    console.error("");
    console.error("Loop failed. Moving story to blocked.");

    const currentStoryFile = findStoryFile(story.fileName) ?? inProgressStory;
    const blockedStory = moveStoryToStatus(currentStoryFile, "blocked");
    const failureOutput = error.output || error.message || "Unknown failure";
    const category = classifyDecisionCategory(failureOutput);

    appendBlockedReport(blockedStory, {
      failedStep: error.command ? formatCommand(error.command, error.args) : "loop",
      exitCode: error.status ?? 1,
      attempts: error.blocked ? 1 : maxFixRounds + 1,
      summary: error.blocked
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
    process.exit(1);
  }
}

const isDirectRun = process.argv[1] && new URL(import.meta.url).pathname.endsWith(process.argv[1].replace(/\\/g, "/"));

if (isDirectRun) {
  await main();
}
