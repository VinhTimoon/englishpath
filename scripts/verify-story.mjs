import { execSync } from "node:child_process";
import fs from "node:fs";

const storyFile = process.argv[2];

if (!storyFile) {
  console.error("Usage: node scripts/verify-story.mjs <story-file>");
  process.exit(1);
}

const story = fs.readFileSync(storyFile, "utf8");

function run(command) {
  try {
    return execSync(command, { encoding: "utf8", stdio: "pipe" }).trim();
  } catch (error) {
    return error.stdout?.toString().trim() || error.message;
  }
}

const changedFiles = run("git diff --name-only");

console.log("Changed files:");
console.log(changedFiles || "(none)");

const forbiddenChecks = [
  ".env",
  "apps/api/.env",
  "node_modules",
  "apps/api/node_modules",
  "apps/web/node_modules",
  "apps/api/dist",
  "apps/web/.next",
];

for (const forbidden of forbiddenChecks) {
  if (changedFiles.split(/\r?\n/).some((file) => file === forbidden || file.startsWith(`${forbidden}/`))) {
    console.error(`Forbidden file changed: ${forbidden}`);
    process.exit(1);
  }
}

if (story.includes("forbidden_paths:") && story.includes("apps/**")) {
  const appChanged = changedFiles
    .split(/\r?\n/)
    .filter(Boolean)
    .some((file) => file.startsWith("apps/"));

  if (appChanged) {
    console.error("This story forbids apps/** but app files were changed.");
    process.exit(1);
  }
}

console.log("Story verification passed.");
