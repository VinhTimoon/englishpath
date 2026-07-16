import fs from "node:fs";
import { spawnSync } from "node:child_process";

export class CommandError extends Error {
  constructor(message, details) {
    super(message);
    this.name = "CommandError";
    this.command = details.command;
    this.args = details.args;
    this.status = details.status;
    this.stdout = details.stdout;
    this.stderr = details.stderr;
    this.output = details.output;
    this.timeoutMs = details.timeoutMs;
    this.timedOut = details.timedOut ?? false;
    this.phase = details.phase;
    this.blocked = details.blocked ?? false;
    this.retriable = details.retriable ?? true;
    this.contractReason = details.contractReason;
  }
}

const PLAN_SECTIONS = [
  "## 1. Story ID",
  "## 2. Scope Summary",
  "## 3. Allowed Paths",
  "## 4. Forbidden Paths",
  "## 5. Files Likely to Change",
  "## 6. Implementation Steps",
  "## 7. Verification Steps",
  "## 8. Risks",
];

const STATUS_RULES = {
  build: ["completed", "blocked"],
  review: ["pass", "fixed", "blocked"],
  debug: ["fixed", "blocked"],
};

const CONFIRMATION_ONLY_PATTERN = /\b(confirm|confirmation|approve|approval|checkpoint|ready to proceed|shall i|would you like me to|do you want me to|waiting for your input)\b/i;

export const PHASE_ARTIFACTS = {
  plan: {
    responseFile: ".codex-plan.result.md",
    extraOutputs: [".codex-plan.md"],
  },
  build: {
    responseFile: ".codex-build.result.md",
  },
  review: {
    responseFile: ".codex-review.result.md",
  },
  debug: {
    responseFile: ".codex-debug.result.md",
  },
};

export function formatCommand(command, args = []) {
  return [command, ...args]
    .map((part) => (/[^\\w./:-]/u.test(part) ? JSON.stringify(part) : part))
    .join(" ");
}

export function removePhaseArtifacts(phase) {
  const artifacts = PHASE_ARTIFACTS[phase];
  if (!artifacts) {
    throw new Error(`Unknown phase: ${phase}`);
  }

  for (const file of [artifacts.responseFile, ...(artifacts.extraOutputs ?? [])]) {
    if (fs.existsSync(file)) {
      fs.rmSync(file, { force: true });
    }
  }
}

function extractStoryId(prompt) {
  const match = prompt.match(/\nid:\s*([A-Z0-9-]+)/);
  return match?.[1] ?? null;
}

function extractStatus(text) {
  const match = text.match(/(?:^|\n)Status:\s*([a-z-]+)/i);
  return match?.[1]?.toLowerCase() ?? null;
}

function ensureFreshFile(file, phase, startedAt) {
  if (!fs.existsSync(file)) {
    throw createPhaseContractError({
      phase,
      reason: `Missing required artifact: ${file}`,
      evidence: `Expected ${file} to be written during the ${phase} phase.`,
    });
  }

  const stats = fs.statSync(file);
  if (stats.mtimeMs < startedAt) {
    throw createPhaseContractError({
      phase,
      reason: `Stale artifact detected: ${file}`,
      evidence: `${file} was last updated before the current ${phase} phase started.`,
    });
  }
}

function validatePlanArtifact(planText, expectedStoryId) {
  if (!planText.trim()) {
    return "Plan artifact is empty.";
  }
  if (expectedStoryId && !planText.includes(expectedStoryId)) {
    return `Plan artifact does not reference story ${expectedStoryId}.`;
  }

  const missingSections = PLAN_SECTIONS.filter((section) => !planText.includes(section));
  if (missingSections.length > 0) {
    return `Plan artifact is missing required sections: ${missingSections.join(", ")}`;
  }

  return null;
}

export function createPhaseContractError({ phase, reason, evidence, output, timeoutMs, status, blocked = false, command = "codex", args = [] }) {
  const details = [reason, evidence].filter(Boolean).join("\n");
  return new CommandError(`Phase contract failed for ${phase}: ${reason}`, {
    command,
    args,
    status: status ?? 1,
    stdout: "",
    stderr: "",
    output: output ? [details, output].filter(Boolean).join("\n\n") : details,
    timeoutMs,
    phase,
    blocked,
    retriable: !blocked,
    contractReason: reason,
  });
}

export function validatePhaseArtifacts({ phase, prompt, startedAt, commandResult }) {
  const artifacts = PHASE_ARTIFACTS[phase];
  if (!artifacts) {
    throw new Error(`Unknown phase: ${phase}`);
  }

  ensureFreshFile(artifacts.responseFile, phase, startedAt);
  const responseText = fs.readFileSync(artifacts.responseFile, "utf8").trim();

  if (!responseText) {
    throw createPhaseContractError({
      phase,
      reason: `Empty final response artifact: ${artifacts.responseFile}`,
      evidence: "The phase exited without a usable final response.",
      output: commandResult.output,
      command: commandResult.command,
      args: commandResult.args,
    });
  }

  if (phase === "plan") {
    const planFile = artifacts.extraOutputs[0];
    ensureFreshFile(planFile, phase, startedAt);
    const planIssue = validatePlanArtifact(fs.readFileSync(planFile, "utf8"), extractStoryId(prompt));
    if (planIssue) {
      throw createPhaseContractError({
        phase,
        reason: planIssue,
        evidence: `Planning must write a valid ${planFile}.`,
        output: responseText,
        command: commandResult.command,
        args: commandResult.args,
      });
    }

    return {
      phase,
      status: "completed",
      responseFile: artifacts.responseFile,
      responseText,
      blocked: false,
    };
  }

  const allowedStatuses = STATUS_RULES[phase];
  const status = extractStatus(responseText);
  if (!status || !allowedStatuses.includes(status)) {
    const reason = CONFIRMATION_ONLY_PATTERN.test(responseText)
      ? "Confirmation-only or checkpoint response is not a valid terminal phase result."
      : `Invalid or missing terminal status. Expected one of: ${allowedStatuses.join(", ")}.`;
    throw createPhaseContractError({
      phase,
      reason,
      evidence: `Final response artifact: ${artifacts.responseFile}`,
      output: responseText,
      command: commandResult.command,
      args: commandResult.args,
    });
  }

  return {
    phase,
    status,
    responseFile: artifacts.responseFile,
    responseText,
    blocked: status === "blocked",
  };
}

export function formatPhaseTimeoutMessage(phase, timeoutMs, command, args = []) {
  return `Phase "${phase}" timed out after ${timeoutMs}ms while running ${formatCommand(command, args)}.`;
}

export function runCommand(command, args = [], options = {}) {
  const {
    cwd,
    input,
    env,
    stdio = "pipe",
    allowFailure = false,
    printCommand = false,
    forwardOutput = false,
    timeoutMs,
  } = options;

  if (printCommand) {
    console.log(`\n$ ${formatCommand(command, args)}`);
  }

  const result = spawnSync(command, args, {
    cwd,
    env,
    encoding: "utf8",
    input,
    stdio,
    shell: false,
    timeout: timeoutMs,
  });

  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const output = [stdout.trimEnd(), stderr.trimEnd()].filter(Boolean).join("\n");

  if (forwardOutput) {
    if (stdout) {
      process.stdout.write(stdout);
    }
    if (stderr) {
      process.stderr.write(stderr);
    }
  }

  if (result.error) {
    throw new CommandError(result.error.message, {
      command,
      args,
      status: result.status ?? 1,
      stdout,
      stderr,
      output,
      timeoutMs,
      timedOut: result.error.code === "ETIMEDOUT",
    });
  }

  if ((result.status ?? 0) !== 0 && !allowFailure) {
    throw new CommandError(
      `Command failed with exit code ${result.status}: ${formatCommand(command, args)}`,
      {
        command,
        args,
        status: result.status ?? 1,
        stdout,
        stderr,
        output,
        timeoutMs,
      }
    );
  }

  return {
    command,
    args,
    status: result.status ?? 0,
    stdout,
    stderr,
    output,
  };
}
