import { execSync } from "node:child_process";
import fs from "node:fs";

function hasScript(packageJsonPath, scriptName) {
  if (!fs.existsSync(packageJsonPath)) return false;
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  return Boolean(pkg.scripts?.[scriptName]);
}

function run(command) {
  console.log(`\n$ ${command}`);
  execSync(command, { stdio: "inherit" });
}

const checks = [
  { command: "pnpm lint", script: "lint" },
  { command: "pnpm typecheck", script: "typecheck" },
  { command: "pnpm test", script: "test" },
  { command: "pnpm build", script: "build" },
];

let failed = false;

for (const item of checks) {
  if (!hasScript("package.json", item.script)) {
    console.log(`Skip: root has no script "${item.script}"`);
    continue;
  }

  try {
    run(item.command);
  } catch {
    failed = true;
  }
}

if (failed) {
  console.error("One or more checks failed.");
  process.exit(1);
}

console.log("Available checks passed.");
