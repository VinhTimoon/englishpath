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
- If implementation requires forbidden paths, stop and write a blocked report.
- Keep changes minimal and focused.

Final response must include:
1. Summary
2. Files changed
3. Verification commands to run
4. Risks
`;

output += `\n\n# Story\n\n${story}\n`;
output += `\n\n# Implementation Plan\n\n${plan}\n`;

for (const file of contextFiles) {
  const content = read(file);
  if (content) output += `\n\n# Context: ${file}\n\n${content}\n`;
}

console.log(output);