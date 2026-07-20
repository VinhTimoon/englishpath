import fs from "node:fs";

const storyFile = process.argv[2];

if (!storyFile) {
  console.error("Usage: node scripts/create-plan-prompt.mjs <story-file>");
  process.exit(1);
}

const read = (file) =>
  fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";

const story = read(storyFile);
const storyId = story.match(/^id:\s*([^\s]+)\s*$/m)?.[1];

if (!storyId) {
  console.error(`Story id not found in ${storyFile}`);
  process.exit(1);
}

const contextFiles = [
  "AGENTS.md",
  "ai-skills/routing/skill-router.md",
  ".agents/skills/englishpath-token-optimizer/SKILL.md",
  "_bmad-output/planning-artifacts/project-context.md",
  "_bmad-output/planning-artifacts/architecture.md",
  "_bmad-output/implementation-artifacts/definition-of-done.md",
];

let output = `# Codex Planning Phase\n\n`;

output += `
You are the planning agent for EnglishPath.

Task:
- Read the story.
- Read BMAD and routing context.
- Create a short implementation plan.
- Use the supplied story and context directly; do not perform a broad codebase audit.
- Return the plan promptly after inspecting only the minimum files needed to resolve a
  concrete uncertainty.
- Do not modify source code.
- Do not implement anything.
- Run non-interactively.
- Never ask for confirmation, approval, or a checkpoint.
- If the plan cannot be completed within scope, state the blocker clearly in the final response.
- Do not write files. Return the complete plan in the final response so the trusted
  outer runner can materialize .codex-plan.md.

The plan must include:
1. Story ID
2. Scope Summary
3. Allowed Paths
4. Forbidden Paths
5. Files Likely to Change
6. Implementation Steps
7. Verification Steps
8. Risks

Final response rules:
- Return only the complete implementation plan.
- Use the exact numbered ## headings listed above, in the same order and exactly once.
- Under \`## 1. Story ID\`, write exactly \`${storyId}\` and nothing else.
- Do not ask the user to continue.
- Do not add a preface, summary, status line, or file-write claim.
`;

output += `\n\n# Story\n\n${story}\n`;

for (const file of contextFiles) {
  const content = read(file);
  if (content) output += `\n\n# Context: ${file}\n\n${content}\n`;
}

console.log(output);
