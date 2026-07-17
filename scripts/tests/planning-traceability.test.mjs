import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { validatePlanningTraceability } from "../planning-traceability.mjs";

function writeFile(baseDir, relativePath, content) {
  const target = path.join(baseDir, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function createRows(prefix, min, max, label) {
  const rows = [];
  for (let index = min; index <= max; index += 1) {
    const id = `${prefix}-${String(index).padStart(3, "0")}`;
    rows.push(`| \`${id}\` | ${label} ${id} |`);
  }
  return rows.join("\n");
}

function createBaselineFixture(overrides = {}) {
  const frRows = overrides.frRows ?? createRows("FR", 1, 29, "Requirement");
  const nfrRows = overrides.nfrRows ?? createRows("NFR", 1, 17, "Constraint");
  const ufRows = overrides.ufRows ?? createRows("UF", 1, 13, "Flow");

  return {
    "docs/02_PRD.md": `# PRD

## Functional Requirements

| ID | Requirement |
| -- | ----------- |
${frRows}

## Non-Functional Requirements

| ID | Requirement |
| -- | ----------- |
${nfrRows}
`,
    "docs/03_USER_FLOWS.md": `# Flows

## Flow Index

| ID | Flow |
| -- | ---- |
${ufRows}
`,
    "_bmad-output/planning-artifacts/epic-map.md":
      overrides.epicMap ??
      `# Epic Map

## Epic Sequence

- Covers \`FR-001\` to \`FR-029\`.
- Covers \`NFR-001\` to \`NFR-017\`.
- Covers \`UF-001\` to \`UF-013\`.

## Explicit Coverage Ledger

- Reinforces \`FR-001\` to \`FR-029\`.
- Reinforces \`NFR-001\` to \`NFR-017\`.
- Reinforces \`UF-001\` to \`UF-013\`.
`,
    "_bmad-output/planning-artifacts/story-map.md":
      overrides.storyMap ??
      `# Story Map

## Requirement And Flow Assignment

- Assigns \`FR-001\` to \`FR-029\`.
- Assigns \`NFR-001\` to \`NFR-017\`.
- Assigns \`UF-001\` to \`UF-013\`.
`,
  };
}

function withFixture(overrides, callback) {
  const baseDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "englishpath-traceability-"),
  );
  const files = createBaselineFixture(overrides);
  for (const [relativePath, content] of Object.entries(files)) {
    writeFile(baseDir, relativePath, content);
  }
  return callback(baseDir);
}

test("validatePlanningTraceability accepts the complete baseline", () => {
  withFixture({}, (baseDir) => {
    const result = validatePlanningTraceability(baseDir);
    assert.equal(result.ok, true);
    assert.deepEqual(result.issues, []);
  });
});

test("validatePlanningTraceability reports missing canonical definitions", () => {
  withFixture(
    {
      frRows: createRows("FR", 1, 1, "Requirement"),
    },
    (baseDir) => {
      const result = validatePlanningTraceability(baseDir);
      assert.equal(result.ok, false);
      assert.match(
        result.issues.join("\n"),
        /docs\/02_PRD\.md section "Functional Requirements" is missing definition "FR-002"/,
      );
    },
  );
});

test("validatePlanningTraceability reports duplicate canonical definitions", () => {
  withFixture(
    {
      frRows: `${createRows("FR", 1, 29, "Requirement")}
| \`FR-002\` | Duplicate FR-002 |
`,
    },
    (baseDir) => {
      const result = validatePlanningTraceability(baseDir);
      assert.equal(result.ok, false);
      assert.match(
        result.issues.join("\n"),
        /docs\/02_PRD\.md section "Functional Requirements" defines "FR-002" more than once at lines \d+, \d+\./,
      );
    },
  );
});

test("validatePlanningTraceability reports missing map coverage", () => {
  withFixture(
    {
      epicMap: `# Epic Map

## Epic Sequence

- Covers \`FR-001\` to \`FR-029\`.
- Covers \`NFR-001\` to \`NFR-017\`.
- Covers \`UF-001\` to \`UF-012\`.

## Explicit Coverage Ledger

- Reinforces \`FR-001\` to \`FR-029\`.
- Reinforces \`NFR-001\` to \`NFR-017\`.
- Reinforces \`UF-001\` to \`UF-012\`.
`,
      storyMap: `# Story Map

## Requirement And Flow Assignment

- Assigns \`FR-001\` to \`FR-029\`.
- Assigns \`NFR-001\` to \`NFR-017\`.
- Assigns \`UF-001\` to \`UF-012\`.
`,
    },
    (baseDir) => {
      const result = validatePlanningTraceability(baseDir);
      assert.equal(result.ok, false);
      assert.match(
        result.issues.join("\n"),
        /Planning maps are missing user flow coverage for: UF-013\./,
      );
    },
  );
});

test("validatePlanningTraceability reports malformed definition IDs and ranges", () => {
  withFixture(
    {
      frRows: `| ID | Requirement |
| -- | ----------- |
| \`FR-001\` | Requirement FR-001 |
| \`FR-XYZ\` | Broken |
${createRows("FR", 2, 29, "Requirement")}`,
      epicMap: `# Epic Map

## Epic Sequence

- Covers \`FR-029\` to \`FR-001\`.
- Covers \`NFR-001\` to \`UF-013\`.
- Covers \`UF-001\` to \`UF-013\`.

## Explicit Coverage Ledger

- Reinforces \`FR-001\` to \`FR-029\`.
- Reinforces \`NFR-001\` to \`NFR-017\`.
- Reinforces \`UF-001\` to \`UF-013\`.
`,
    },
    (baseDir) => {
      const result = validatePlanningTraceability(baseDir);
      assert.equal(result.ok, false);
      const message = result.issues.join("\n");
      assert.match(
        message,
        /docs\/02_PRD\.md:\d+ section "Functional Requirements" has malformed definition ID "FR-XYZ"\./,
      );
      assert.match(
        message,
        /_bmad-output\/planning-artifacts\/epic-map\.md:\d+ section "Epic Sequence" has descending range "`FR-029` to `FR-001`"\./,
      );
      assert.match(
        message,
        /_bmad-output\/planning-artifacts\/epic-map\.md:\d+ section "Epic Sequence" has malformed range "`NFR-001` to `UF-013`" across different families\./,
      );
    },
  );
});

test("validatePlanningTraceability emits actionable diagnostics with file, line, and section", () => {
  withFixture(
    {
      storyMap: `# Story Map

## Requirement And Flow Assignment

- Assigns \`FR-01A\`.
`,
    },
    (baseDir) => {
      const result = validatePlanningTraceability(baseDir);
      assert.equal(result.ok, false);
      assert.match(
        result.issues.join("\n"),
        /_bmad-output\/planning-artifacts\/story-map\.md:\d+ section "Requirement And Flow Assignment" has malformed requirement token "FR-01A"\./,
      );
    },
  );
});
