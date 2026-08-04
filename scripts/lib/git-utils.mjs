import { runCommand } from "./process-utils.mjs";
import { normalizePath } from "./path-policy.mjs";

function git(args, options = {}) {
  return runCommand("git", args, options);
}

function runGit(args, options = {}) {
  const { gitRunner = git, ...runnerOptions } = options;
  return gitRunner(args, runnerOptions);
}

export function ensureGitRepository(options = {}) {
  try {
    runGit(["rev-parse", "--is-inside-work-tree"], options);
  } catch {
    throw new Error("This project is not a git repository.");
  }
}

export function getCurrentBranch(options = {}) {
  return runGit(["branch", "--show-current"], options).stdout.trim();
}

export function getWorktreeStatus(options = {}) {
  return runGit(["status", "--porcelain"], options).stdout.trim();
}

export function ensureLoopBaseState(baseBranch = "dev", options = {}) {
  ensureGitRepository(options);

  const currentBranch = getCurrentBranch(options);
  if (currentBranch !== baseBranch) {
    throw new Error(`Loop must start on "${baseBranch}". Current branch: "${currentBranch}".`);
  }

  const worktreeStatus = getWorktreeStatus(options);
  if (worktreeStatus) {
    throw new Error(`Loop requires a clean worktree before creating a story branch.\n${worktreeStatus}`);
  }

  let upstream;
  try {
    upstream = runGit(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"], options).stdout.trim();
  } catch {
    throw new Error(`Branch "${baseBranch}" must track an upstream branch before the loop can run.`);
  }

  const divergence = runGit(["rev-list", "--left-right", "--count", `${baseBranch}...${upstream}`], options)
    .stdout.trim()
    .split(/\s+/u)
    .map((value) => Number.parseInt(value, 10));

  const [ahead, behind] = divergence;
  if (ahead !== 0 || behind !== 0) {
    throw new Error(`Branch "${baseBranch}" must match upstream "${upstream}" before the loop can run. Ahead: ${ahead}, behind: ${behind}.`);
  }
}

export function checkoutNewBranch(branchName, options = {}) {
  runGit(["checkout", "-b", branchName], { ...options, printCommand: true, stdio: "inherit" });
}

export function branchExists(branchName, options = {}) {
  return runGit(
    ["show-ref", "--verify", "--quiet", `refs/heads/${branchName}`],
    { ...options, allowFailure: true },
  ).status === 0;
}

export function stageAll(options = {}) {
  runGit(["add", "."], { ...options, printCommand: true, stdio: "inherit" });
}

export function commit(message, options = {}) {
  runGit(["commit", "-m", message], { ...options, printCommand: true, stdio: "inherit" });
}

export function collectChangedFiles(baseBranch = "dev", options = {}) {
  const files = new Set();
  const readLines = (args) =>
    runGit(args, { ...options, allowFailure: true }).stdout
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean);

  const mergeBase = runGit(["merge-base", baseBranch, "HEAD"], options).stdout.trim();
  for (const file of readLines(["diff", "--name-only", `${mergeBase}...HEAD`])) {
    files.add(normalizePath(file));
  }
  for (const file of readLines(["diff", "--name-only", "--cached"])) {
    files.add(normalizePath(file));
  }
  for (const file of readLines(["diff", "--name-only"])) {
    files.add(normalizePath(file));
  }
  for (const file of readLines(["ls-files", "--others", "--exclude-standard"])) {
    files.add(normalizePath(file));
  }

  return [...files].sort();
}

export function mergeStoryBranchIntoDev(storyBranch, options = {}) {
  const baseBranch = options.baseBranch ?? "dev";
  const currentBranch = getCurrentBranch(options);
  if (currentBranch !== storyBranch) {
    throw new Error(`Expected to merge from "${storyBranch}", but current branch is "${currentBranch}".`);
  }

  runGit(["checkout", baseBranch], { ...options, printCommand: true, stdio: "inherit" });
  runGit(["merge", "--ff-only", storyBranch], { ...options, printCommand: true, stdio: "inherit" });
}
