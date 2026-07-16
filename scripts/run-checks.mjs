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
  { filter: "web", packageJson: "apps/web/package.json", scripts: ["lint", "build"] },
  { filter: "api", packageJson: "apps/api/package.json", scripts: ["lint", "build", "test"] },
];

let failed = false;

for (const item of checks) {
  for (const script of item.scripts) {
    if (!hasScript(item.packageJson, script)) {
      console.log(`Skip: ${item.filter} has no script "${script}"`);
      continue;
    }

    try {
      run(`pnpm --filter ${item.filter} ${script}`);
    } catch {
      failed = true;
    }
  }
}

if (failed) {
  console.error("One or more checks failed.");
  process.exit(1);
}

console.log("Available checks passed.");
