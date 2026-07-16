import fs from "node:fs";

const storyFile = process.argv[2];
const failedStep = process.argv[3];
const failureLogFile = process.argv[4];

if (!storyFile || !failedStep || !failureLogFile) {
  console.error("Usage: node scripts/create-debug-prompt.mjs <story-file> <failed-step> <failure-log-file>");
  process.exit(1);
}

const read = (file) => (fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "");

const story = read(storyFile);
const plan = read(".codex-plan.md");
const failureLog = read(failureLogFile);

let output = `# Codex Debug Phase\n\n`;
output += `
You are the debug agent for EnglishPath.

Task:
- Fix only the failure from the named gate.
- Stay inside the current story scope.
- Preserve existing successful work.
- Do not modify unrelated files.
- Do not modify .env files.
- Re-run only the failing gate after the fix.
- Run non-interactively.
- Never ask for confirmation, approval, or a checkpoint.
- If the failure is caused by a business, dependency, infrastructure, security, or environment decision, return a blocked result.
- If the failing gate cannot be fixed safely within scope, return a blocked result.

Return:
- Status: fixed | blocked
- Root cause
- Files changed
- Remaining blocker if any

Final response rules:
- Return one terminal result only.
- Do not ask the user to continue.
- If blocked, explain the blocker concretely.
`;

output += `\n\n# Failed Gate\n\n${failedStep}\n`;
output += `\n\n# Story\n\n${story}\n`;
output += `\n\n# Plan\n\n${plan}\n`;
output += `\n\n# Failure Output\n\n${failureLog}\n`;

for (const file of [
  "AGENTS.md",
  "ai-skills/routing/skill-router.md",
  ".agents/skills/englishpath-token-optimizer/SKILL.md",
  "_bmad-output/implementation-artifacts/definition-of-done.md",
]) {
  const content = read(file);
  if (content) {
    output += `\n\n# Context: ${file}\n\n${content}\n`;
  }
}

console.log(output);
