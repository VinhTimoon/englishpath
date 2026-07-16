import fs from "node:fs";

const storyFile = process.argv[2];

if (!storyFile) {
  console.error("Usage: node scripts/story-doctor.mjs <story-file>");
  process.exit(1);
}

if (!fs.existsSync(storyFile)) {
  console.error(`Story not found: ${storyFile}`);
  process.exit(1);
}

const content = fs.readFileSync(storyFile, "utf8");

function requireText(text) {
  if (!content.includes(text)) {
    console.error(`Missing required text: ${text}`);
    process.exit(1);
  }
}

const requiredFrontmatter = [
  "id:",
  "title:",
  "status:",
  "type:",
  "allowed_paths:",
  "forbidden_paths:",
  "max_fix_rounds:",
];

const requiredSections = [
  "## Goal",
  "## Acceptance Criteria",
  "## Verification",
];

for (const item of requiredFrontmatter) requireText(item);
for (const item of requiredSections) requireText(item);

if (!content.includes("status: ready")) {
  console.error("Story must have status: ready before implementation.");
  process.exit(1);
}

console.log("Story doctor passed.");
