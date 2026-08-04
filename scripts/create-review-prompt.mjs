import fs from "node:fs";
import { execSync } from "node:child_process";

const storyFile = process.argv[2];

if (!storyFile) {
  console.error("Usage: node scripts/create-review-prompt.mjs <story-file>");
  process.exit(1);
}

const read = (file) =>
  fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";

function sh(command) {
  try {
    return execSync(command, { encoding: "utf8", stdio: "pipe" }).trim();
  } catch (error) {
    return error.stdout?.toString() || error.message;
  }
}

const story = read(storyFile);
const plan = read(".codex-plan.md");
const diffStat = sh("git diff --stat");
const diffNames = sh("git diff --name-only");

const contextFiles = [
  "AGENTS.md",
  "ai-skills/routing/skill-router.md",
  "_bmad-output/implementation-artifacts/definition-of-done.md",
  "_bmad-output/implementation-artifacts/qa-checklist.md",
];

let output = `# Codex Review and Test Phase\n\n`;

output += `
You are the review and testing agent for EnglishPath.

Task:
- Review the current uncommitted diff against the story.
- Check scope compliance.
- Report P0/P1 findings only when they are caused by the current diff or are explicit
  acceptance criteria of this story. Pre-existing defects outside the story's allowed
  paths must be listed as out-of-scope risks and must not block this review.
- Check forbidden paths.
- Check architecture boundaries.
- Check missing tests.
- Review tests and identify missing coverage, but do not add or update files.
- Do not rerun test or build commands that require writes; the trusted outer loop runs all quality gates immediately before and after this review.
- Do not broaden the feature scope.
- Do not modify .env files.
- Ready-only story-doctor already ran before this story moved to in-progress; do not rerun story-doctor against the old ready-path file during review.
- Run non-interactively.
- Do not load or follow additional workflow skill files; the required review context is embedded below.
- Never ask for confirmation, approval, a checkpoint, or human review before returning a result.
- Run in read-only mode and do not make fixes; return blocked when fixes are required.
- If the story cannot be approved safely within scope, return a blocked result.

Return:
- Status: pass | blocked
- P0/P1/P2 findings
- Tests reviewed and missing coverage
- Commands to run
- Remaining risks

Final response rules:
- Return one terminal result only.
- Do not ask the user to continue.
- Do not request a checkpoint or confirmation.
`;

output += `\n\n# Story\n\n${story}\n`;
output += `\n\n# Plan\n\n${plan}\n`;
output += `\n\n# Git Diff Names\n\n${diffNames}\n`;
output += `\n\n# Git Diff Stat\n\n${diffStat}\n`;

for (const file of contextFiles) {
  const content = read(file);
  if (content) output += `\n\n# Context: ${file}\n\n${content}\n`;
}

console.log(output);
