import fs from "node:fs";

const storyFile = process.argv[2];

if (!storyFile) {
  console.error("Usage: node scripts/create-codex-prompt.mjs <story-file>");
  process.exit(1);
}

if (!fs.existsSync(storyFile)) {
  console.error(`Story not found: ${storyFile}`);
  process.exit(1);
}

const story = fs.readFileSync(storyFile, "utf8");

const alwaysLoad = [
  "AGENTS.md",
  "ai-skills/routing/skill-router.md",
  ".agents/skills/englishpath-token-optimizer/SKILL.md",
  "_bmad-output/planning-artifacts/project-context.md",
  "_bmad-output/implementation-artifacts/definition-of-done.md",
];

const docsContext = [
  "docs/04_SYSTEM_ARCHITECTURE.md",
  "docs/05_FRONTEND_ARCHITECTURE.md",
  "docs/06_BACKEND_ARCHITECTURE.md",
  "docs/07_DATABASE_DESIGN.md",
  "docs/08_API_CONTRACT.md",
  "docs/09_UI_DESIGN_SYSTEM.md",
  "docs/10_TEST_STRATEGY.md",
];

function readIfExists(file) {
  if (!fs.existsSync(file)) return "";
  return `\n\n# Context: ${file}\n\n${fs.readFileSync(file, "utf8")}`;
}

let output = "";

output += `# Codex Loop Engineer Task\n\n`;

output += `
You are the loop engineer for EnglishPath.

You must implement exactly one story.

Core rules:
- Follow AGENTS.md.
- Follow BMAD artifacts.
- Follow ai-skills/routing/skill-router.md.
- Load only relevant context.
- Respect allowed_paths and forbidden_paths.
- Do not modify unrelated files.
- Do not modify .env files.
- Do not modify apps/** if the story forbids apps/**.
- If the requested change requires forbidden paths, stop and mark blocked in your final report.
- If a verification command does not exist, report it honestly.
- Do not pretend tests passed if they were not run.

Final report must include:
1. Story id
2. Summary
3. Files changed
4. Verification commands run
5. Result: completed / blocked
6. Risks or follow-up needed
`;

output += `\n\n# Story File: ${storyFile}\n\n${story}\n`;

for (const file of alwaysLoad) {
  output += readIfExists(file);
}

const lowerStory = story.toLowerCase();

const shouldLoadDocs =
  lowerStory.includes("docs") ||
  lowerStory.includes("architecture") ||
  lowerStory.includes("frontend") ||
  lowerStory.includes("backend") ||
  lowerStory.includes("database") ||
  lowerStory.includes("api") ||
  lowerStory.includes("ui") ||
  lowerStory.includes("testing");

if (shouldLoadDocs) {
  for (const file of docsContext) {
    output += readIfExists(file);
  }
}

console.log(output);
