import fs from "node:fs";

const storyFile = process.argv[2];

if (!storyFile) {
  console.error("Usage: node scripts/create-plan-prompt.mjs <story-file>");
  process.exit(1);
}

const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";

const story = read(storyFile);

const contextFiles = [
  "AGENTS.md",
  "ai-skills/routing/skill-router.md",
  ".agents/skills/englishpath-token-optimizer/SKILL.md",
  "_bmad-output/planning-artifacts/project-context.md",
  "_bmad-output/planning-artifacts/architecture.md",
  "_bmad-output/implementation-artifacts/definition-of-done.md"
];

let output = `# Codex Planning Phase\n\n`;

output += `
You are the planning agent for EnglishPath.

Task:
- Read the story.
- Read BMAD and routing context.
- Create a short implementation plan.
- Do not modify source code.
- Do not implement anything.
- Write the plan to .codex-plan.md.

The plan must include:
1. Story id
2. Scope summary
3. Allowed paths
4. Forbidden paths
5. Files likely to change
6. Implementation steps
7. Verification steps
8. Risks
`;

output += `\n\n# Story\n\n${story}\n`;

for (const file of contextFiles) {
  const content = read(file);
  if (content) output += `\n\n# Context: ${file}\n\n${content}\n`;
}

console.log(output);