import fs from "node:fs";

import {
  BLOCKED_EXIT_CODE,
  PHASE_ARTIFACTS,
  createPhaseContractError,
  formatPhaseTimeoutMessage,
  materializePlanArtifact,
  removePhaseArtifacts,
  resolvePhaseSandbox,
  runCommand,
  validatePhaseArtifacts,
} from "./lib/process-utils.mjs";

const phase = process.argv[2];
const promptFile = process.argv[3];

const PLAN_PRIMARY_ROUTE = Object.freeze({
  model: "gpt-5.6-sol",
  reasoning: "high",
});

function isExplicitCapacityUnavailable(error) {
  const output = [error.output, error.message].filter(Boolean).join("\n");
  return /\b(?:capacity(?:[_\s-]+is)?[_\s-]+unavailable|at[_\s-]+capacity)\b/iu.test(
    output,
  );
}

function buildCodexArgs({ sandbox, route, responseFile }) {
  return [
    "exec", "--sandbox", sandbox, "-c", `model=${route.model}`, "-c",
    `model_reasoning_effort=${route.reasoning}`, "--output-last-message",
    responseFile, "-",
  ];
}

function exitWithError(error) {
  const output = error.output || error.message;
  if (output) {
    console.error(output);
  }
  process.exit(error.blocked ? BLOCKED_EXIT_CODE : (error.status ?? 1));
}

function main() {
  if (!phase || !promptFile) {
    console.error(
      "Usage: node scripts/codex-runner.mjs <plan|build|review|debug> <prompt-file>",
    );
    process.exit(1);
  }

  const configPath = "scripts/codex-models.json";
  if (!fs.existsSync(configPath)) {
    console.error(`Missing ${configPath}`);
    process.exit(1);
  }

  const models = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const selected = models[phase];
  if (!selected) {
    console.error(`Unknown phase: ${phase}`);
    process.exit(1);
  }

  if (!fs.existsSync(promptFile)) {
    console.error(`Prompt file not found: ${promptFile}`);
    process.exit(1);
  }

  const prompt = fs.readFileSync(promptFile, "utf8");
  const artifacts = PHASE_ARTIFACTS[phase];

  console.log(`Running Codex phase: ${phase}`);
  const primaryRoute = phase === "plan" ? PLAN_PRIMARY_ROUTE : selected;
  console.log(`Model: ${primaryRoute.model}`);
  console.log(`Reasoning: ${primaryRoute.reasoning}`);
  if (phase === "plan") {
    console.log(`Capacity fallback: ${selected.model} (${selected.reasoning}) — temporary operational fallback configured in ${configPath}`);
  }
  console.log(`Timeout: ${selected.timeout_ms}ms`);
  console.log(`Final response artifact: ${artifacts.responseFile}`);

  const sandbox = resolvePhaseSandbox({
    phase,
    configuredSandbox: selected.sandbox,
    prompt,
  });
  console.log(`Sandbox: ${sandbox}`);

  removePhaseArtifacts(phase);
  let startedAt = Date.now();
  let codexArgs = buildCodexArgs({ sandbox, route: primaryRoute, responseFile: artifacts.responseFile });
  let commandResult;
  try {
    commandResult = runCommand("codex", codexArgs, {
      input: prompt,
      stdio: ["pipe", "pipe", "pipe"],
      forwardOutput: true,
      printCommand: true,
      timeoutMs: selected.timeout_ms,
    });
  } catch (error) {
    if (phase === "plan" && isExplicitCapacityUnavailable(error)) {
      console.warn(`Primary planning model ${primaryRoute.model} is at capacity; retrying once with configured fallback ${selected.model}.`);
      removePhaseArtifacts(phase);
      startedAt = Date.now();
      codexArgs = buildCodexArgs({ sandbox, route: selected, responseFile: artifacts.responseFile });
      try {
        commandResult = runCommand("codex", codexArgs, {
          input: prompt, stdio: ["pipe", "pipe", "pipe"], forwardOutput: true,
          printCommand: true, timeoutMs: selected.timeout_ms,
        });
      } catch (fallbackError) {
        fallbackError.output = ["Primary plan attempt failed with explicit capacity-unavailable error.", fallbackError.output].filter(Boolean).join("\n\n");
        throw fallbackError;
      }
    } else {
    const artifactOutput = fs.existsSync(artifacts.responseFile)
      ? fs.readFileSync(artifacts.responseFile, "utf8").trim()
      : "";

    if (error.timedOut) {
      throw createPhaseContractError({
        phase,
        reason: formatPhaseTimeoutMessage(
          phase,
          selected.timeout_ms,
          "codex",
          codexArgs,
        ),
        evidence:
          "The phase exceeded its configured timeout and did not produce a complete terminal result.",
        output: [error.output, artifactOutput].filter(Boolean).join("\n\n"),
        timeoutMs: selected.timeout_ms,
        command: "codex",
        args: codexArgs,
      });
    }

    if (artifactOutput) {
      error.output = [error.output, artifactOutput]
        .filter(Boolean)
        .join("\n\n");
    }
    throw error;
    }
  }

  if (phase === "plan") {
    materializePlanArtifact({ prompt, startedAt });
  }

  const result = validatePhaseArtifacts({
    phase,
    prompt,
    startedAt,
    commandResult,
  });

  if (result.blocked) {
    throw createPhaseContractError({
      phase,
      reason: `Phase returned blocked status in ${result.responseFile}.`,
      evidence: result.responseText,
      output: commandResult.output,
      command: commandResult.command,
      args: commandResult.args,
      blocked: true,
    });
  }

  console.log(`Validated ${phase} phase result: ${result.status}`);
}

try {
  main();
} catch (error) {
  exitWithError(error);
}
