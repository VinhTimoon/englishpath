import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const READY_DIR = "stories/ready";
const IN_PROGRESS_DIR = "stories/in-progress";
const REVIEW_DIR = "stories/review";
const BLOCKED_DIR = "stories/blocked";

function sh(command) {
  console.log(`\n$ ${command}`);
  execSync(command, { stdio: "inherit" });
}

function out(command) {
  return execSync(command, { encoding: "utf8", stdio: "pipe" }).trim();
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function pickStory() {
  ensureDir(READY_DIR);
  const files = fs
    .readdirSync(READY_DIR)
    .filter((file) => file.endsWith(".md"))
    .sort();

  if (files.length === 0) {
    console.log("No ready stories.");
    process.exit(0);
  }

  return path.join(READY_DIR, files[0]);
}

function getStoryId(file) {
  const content = fs.readFileSync(file, "utf8");
  const match = content.match(/id:\s*(.+)/);
  if (!match) throw new Error("Story missing id.");
  return match[1].trim();
}

function moveStory(from, toDir) {
  ensureDir(toDir);
  const to = path.join(toDir, path.basename(from));
  fs.renameSync(from, to);
  return to;
}

function assertGitReady() {
  try {
    out("git rev-parse --is-inside-work-tree");
  } catch {
    console.error("This project is not a git repository. Run git init first.");
    process.exit(1);
  }

  const status = out("git status --short");

  if (status.length > 0) {
    console.error("Working tree is not clean. Commit or stash changes before running the loop.");
    console.error(status);
    process.exit(1);
  }
}

function main() {
  ensureDir(IN_PROGRESS_DIR);
  ensureDir(REVIEW_DIR);
  ensureDir(BLOCKED_DIR);

  assertGitReady();

  const storyFile = pickStory();
  const storyId = getStoryId(storyFile);
  const branch = `story/${storyId.toLowerCase()}`;

  console.log(`Picked story: ${storyFile}`);
  console.log(`Story id: ${storyId}`);
  console.log(`Branch: ${branch}`);

  sh(`git checkout -b ${branch}`);

  const inProgressStory = moveStory(storyFile, IN_PROGRESS_DIR);

  try {
    sh(`node scripts/story-doctor.mjs ${inProgressStory}`);
    sh(`node scripts/create-plan-prompt.mjs ${inProgressStory} > .codex-plan-task.md`);
    sh(`node scripts/codex-runner.mjs plan .codex-plan-task.md`);

    sh(`node scripts/create-build-prompt.mjs ${inProgressStory} > .codex-build-task.md`);
    sh(`node scripts/codex-runner.mjs build .codex-build-task.md`);

    sh(`node scripts/run-checks.mjs`);

    sh(`node scripts/create-review-prompt.mjs ${inProgressStory} > .codex-review-task.md`);
    sh(`node scripts/codex-runner.mjs review .codex-review-task.md`);

    sh(`node scripts/run-checks.mjs`);
    sh(`node scripts/verify-story.mjs ${inProgressStory}`);

    const reviewStory = moveStory(inProgressStory, REVIEW_DIR);

    sh("git add .");
    sh(`git commit -m "${storyId}: complete story"`);

    console.log("");
    console.log("Loop completed.");
    console.log(`Story moved to review: ${reviewStory}`);
    console.log("Next step: manually inspect diff, then open PR later.");
  } catch (error) {
    console.error("");
    console.error("Loop failed. Moving story to blocked.");

    const blockedStory = moveStory(inProgressStory, BLOCKED_DIR);

    fs.appendFileSync(
      blockedStory,
      `\n\n## Blocked Report\n\nThe automated loop failed. Review terminal output and fix manually.\n`
    );

    sh("git add .");
    sh(`git commit -m "${storyId}: blocked by loop" || true`);

    process.exit(1);
  }
}

main();
