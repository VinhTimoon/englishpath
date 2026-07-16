import fs from "node:fs";

const storyFile = process.argv[2];

if (!storyFile) {
  console.error("Usage: node scripts/create-build-prompt.mjs <story-file>");
  process.exit(1);
}

const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";

const story = read(storyFile);
const plan = read(".codex-plan.md");

const contextFiles = [
  "AGENTS.md",
  "ai-skills/routing/skill-router.md",
  ".agents/skills/englishpath-token-optimizer/SKILL.md",
  "_bmad-output/implementation-artifacts/definition-of-done.md"
];

let output = `# Codex Build Phase\n\n`;

output += `
You are the implementation agent for EnglishPath.

Task:
- Implement exactly the current story.
- Follow .codex-plan.md.
- Respect allowed_paths and forbidden_paths.
- Do not modify unrelated files.
- Do not modify .env files.
- Do not run destructive commands.
- Run non-interactively.
- Never ask for confirmation, approval, or a checkpoint.
- If implementation requires forbidden paths, stop and return a blocked result.
- If you cannot complete the story safely within scope, return a blocked result.
- Keep changes minimal and focused.

Final response must include:
- Status: completed | blocked
- Summary
- Files changed
- Verification commands to run
- Risks

Final response rules:
- Return one terminal result only.
- Do not ask the user to continue.
- If blocked, explain the blocker concretely.
`;

output += `\n\n# Story\n\n${story}\n`;
output += `\n\n# Implementation Plan\n\n${plan}\n`;

for (const file of contextFiles) {
  const content = read(file);
  if (content) output += `\n\n# Context: ${file}\n\n${content}\n`;
}

console.log(output);
