import fs from "node:fs";

import { validateStory, validateStoryReadyForLoopStart } from "./lib/story-utils.mjs";

const args = process.argv.slice(2);
const readyOnly = args.includes("--ready-only");
const storyFile = args.find((arg) => !arg.startsWith("--"));

if (!storyFile) {
  console.error("Usage: node scripts/story-doctor.mjs <story-file> [--ready-only]");
  process.exit(1);
}

if (!fs.existsSync(storyFile)) {
  console.error(`Story file not found: ${storyFile}`);
  process.exit(1);
}

const { issues } = readyOnly ? validateStoryReadyForLoopStart(storyFile) : validateStory(storyFile);

if (issues.length > 0) {
  console.error("Story doctor found issues:");
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log("Story doctor passed.");
