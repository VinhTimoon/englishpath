import fs from "node:fs";
import { execSync } from "node:child_process";

const phase = process.argv[2];
const promptFile = process.argv[3];

if (!phase || !promptFile) {
  console.error("Usage: node scripts/codex-runner.mjs <plan|build|review> <prompt-file>");
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

const command = [
  "codex",
  "exec",
  "--sandbox",
  "workspace-write",
  "--ask-for-approval",
  "on-request",
  "-c",
  `model=${JSON.stringify(selected.model)}`,
  "-c",
  `model_reasoning_effort=${JSON.stringify(selected.reasoning)}`,
  "-"
];

const child = execSync(command.join(" "), {
  input: prompt,
  stdio: ["pipe", "inherit", "inherit"],
});