import fs from "node:fs";
import path from "node:path";

import { ensureDir } from "./story-utils.mjs";

export function classifyDecisionCategory(text) {
  const haystack = text.toLowerCase();
  const classifiers = [
    ["security", ["security", "secret", "credential", "token", "permission", "auth"]],
    ["environment", ["environment", "env", "missing config", "unavailable service", "local setup"]],
    ["dependency", ["dependency", "package", "version conflict", "lockfile", "registry"]],
    ["infrastructure", ["docker", "container", "database connection", "supabase", "network", "upstream"]],
    ["business", ["product decision", "spec unclear", "requirement unclear", "acceptance criteria", "business rule"]],
  ];

  for (const [category, patterns] of classifiers) {
    if (patterns.some((pattern) => haystack.includes(pattern))) {
      return category;
    }
  }

  return null;
}

export function createAiRequestFile({ storyId, summary, evidence, attempts, decisionNeeded, impact, category }) {
  const datePrefix = new Date().toISOString().slice(0, 10);
  const fileName = `${datePrefix}-${storyId.toLowerCase()}-${category}.md`;
  const directory = path.join("notes", "ai-req");
  ensureDir(directory);

  const targetFile = path.join(directory, fileName);
  const content = `# AI Request: ${storyId}\n\n## Category\n${category}\n\n## Summary\n${summary}\n\n## Evidence\n${evidence}\n\n## Attempts\n${attempts}\n\n## Decision Needed\n${decisionNeeded}\n\n## Impact\n${impact}\n`;

  fs.writeFileSync(targetFile, content);
  return targetFile;
}
