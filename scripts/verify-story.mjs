import fs from "node:fs";

import { collectChangedFiles } from "./lib/git-utils.mjs";
import { evaluatePathPolicy } from "./lib/path-policy.mjs";
import { validateStory } from "./lib/story-utils.mjs";

const storyFile = process.argv[2];

if (!storyFile) {
  console.error("Usage: node scripts/verify-story.mjs <story-file>");
  process.exit(1);
}

if (!fs.existsSync(storyFile)) {
  console.error(`Story not found: ${storyFile}`);
  process.exit(1);
}

const { story, issues } = validateStory(storyFile);
if (issues.length > 0) {
  console.error("Story verification failed before path checks:");
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

const changedFiles = collectChangedFiles("dev");
const ignoredFiles = [
  ".codex-plan.md",
  ".codex-plan-task.md",
  ".codex-build-task.md",
  ".codex-review-task.md",
  ".codex-debug-task.md",
  ".codex-debug-failure.log",
];

console.log("Changed files:");
console.log(changedFiles.length > 0 ? changedFiles.join("\n") : "(none)");

const evaluations = evaluatePathPolicy(
  changedFiles,
  story.frontmatter.allowed_paths,
  story.frontmatter.forbidden_paths,
  { ignoredPaths: ignoredFiles }
);

const failures = evaluations.filter((item) => !item.ok);
if (failures.length > 0) {
  console.error("Story verification found out-of-scope changes:");
  for (const failure of failures) {
    console.error(`- ${failure.file}: ${failure.reason}`);
  }
  process.exit(1);
}

console.log("Story verification passed.");
