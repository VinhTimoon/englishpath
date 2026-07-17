import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function readPackageJson(packageJsonPath) {
  if (!fs.existsSync(packageJsonPath)) return null;
  return JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
}

function hasScript(packageJsonPath, scriptName) {
  const pkg = readPackageJson(packageJsonPath);
  return Boolean(pkg && pkg.scripts?.[scriptName]);
}

function run(command) {
  console.log(`\n$ ${command}`);
  execSync(command, { stdio: "inherit" });
}

export function runPrismaValidation(options = {}) {
  const execute = options.execute ?? execSync;
  const env = {
    ...process.env,
    DATABASE_URL:
      "postgresql://placeholder:placeholder@127.0.0.1:5432/englishpath?schema=public",
  };

  execute(
    "pnpm --dir apps/api exec prisma validate --schema prisma/schema.prisma",
    { stdio: "inherit", env },
  );
}

const checks = [
  { command: "pnpm format:check", script: "format:check" },
  { command: "pnpm planning:traceability", script: "planning:traceability" },
  { command: "pnpm tool:test", script: "tool:test" },
  { command: "pnpm prisma:validate", script: "prisma:validate" },
  { command: "pnpm lint", script: "lint" },
  { command: "pnpm typecheck", script: "typecheck" },
  { command: "pnpm test", script: "test" },
  {
    command: "pnpm --filter api test:e2e",
    script: "test:e2e",
    packageJson: "apps/api/package.json",
  },
  { command: "pnpm build", script: "build" },
];

const requiredWorkspaceScripts = {
  typecheck: ["apps/api/package.json", "apps/web/package.json"],
  "test:e2e": ["apps/api/package.json"],
};

export function validateRequiredWorkspaceScripts(
  items,
  workspaceScripts = requiredWorkspaceScripts,
) {
  const failures = [];

  for (const item of items) {
    for (const packageJsonPath of workspaceScripts[item.script] ?? []) {
      if (hasScript(packageJsonPath, item.script)) {
        continue;
      }

      failures.push(
        `Missing required workspace script "${item.script}" in ${packageJsonPath}`,
      );
    }
  }

  return failures;
}

export function runChecks(items = checks, options = {}) {
  const execute = options.execute ?? run;
  const missingScripts = validateRequiredWorkspaceScripts(items);
  if (missingScripts.length > 0) {
    for (const message of missingScripts) {
      console.error(message);
    }
    process.exitCode = 1;
    return;
  }

  let failed = false;

  for (const item of items) {
    const packageJsonPath = item.packageJson ?? "package.json";
    if (!hasScript(packageJsonPath, item.script)) {
      console.log(`Skip: ${packageJsonPath} has no script "${item.script}"`);
      continue;
    }

    try {
      execute(item.command);
    } catch {
      failed = true;
    }
  }

  if (failed) {
    console.error("One or more checks failed.");
    process.exitCode = 1;
    return;
  }

  console.log("Available checks passed.");
}

const currentFilePath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";

if (invokedPath === currentFilePath) {
  if (process.argv.includes("--prisma-only")) {
    runPrismaValidation();
  } else {
    runChecks();
  }
}
