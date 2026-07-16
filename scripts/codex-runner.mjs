import fs from "node:fs";

import { runCommand } from "./lib/process-utils.mjs";

const phase = process.argv[2];
const promptFile = process.argv[3];

if (!phase || !promptFile) {
  console.error("Usage: node scripts/codex-runner.mjs <plan|build|review|debug> <prompt-file>");
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

console.log(`Running Codex phase: ${phase}`);
console.log(`Model: ${selected.model}`);
console.log(`Reasoning: ${selected.reasoning}`);

runCommand(
  "codex",
  [
    "exec",
    "--sandbox",
    "workspace-write",
    "-c",
    `model=${selected.model}`,
    "-c",
    `model_reasoning_effort=${selected.reasoning}`,
    "-",
  ],
  {
    input: prompt,
    stdio: ["pipe", "pipe", "pipe"],
    forwardOutput: true,
    printCommand: true,
  }
);
