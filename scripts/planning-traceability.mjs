import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FAMILY_CONFIG = {
  FR: {
    label: "functional",
    prefix: "FR",
    min: 1,
    max: 29,
  },
  NFR: {
    label: "non-functional",
    prefix: "NFR",
    min: 1,
    max: 17,
  },
  UF: {
    label: "user flow",
    prefix: "UF",
    min: 1,
    max: 13,
  },
};

const CANONICAL_FILES = {
  prd: "docs/02_PRD.md",
  flows: "docs/03_USER_FLOWS.md",
  epicMap: "_bmad-output/planning-artifacts/epic-map.md",
  storyMap: "_bmad-output/planning-artifacts/story-map.md",
};

function normalizeMarkdown(content) {
  return content.replace(/\r\n/g, "\n");
}

function readMarkdownFile(relativePath, baseDir = process.cwd()) {
  const filePath = path.join(baseDir, relativePath);
  return normalizeMarkdown(fs.readFileSync(filePath, "utf8"));
}

function padId(value) {
  return String(value).padStart(3, "0");
}

function createExpectedIds(prefix, min, max) {
  const ids = [];
  for (let current = min; current <= max; current += 1) {
    ids.push(`${prefix}-${padId(current)}`);
  }
  return ids;
}

function getExpectedIds(familyKey) {
  const family = FAMILY_CONFIG[familyKey];
  return createExpectedIds(family.prefix, family.min, family.max);
}

function createHeadingMatcher(heading) {
  return new RegExp(
    `^##\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`,
    "m",
  );
}

function getSectionContent(markdown, heading) {
  const match = createHeadingMatcher(heading).exec(markdown);
  if (!match) {
    throw new Error(`Missing required section "${heading}".`);
  }

  const startIndex = match.index + match[0].length;
  const remainder = markdown.slice(startIndex);
  const nextHeadingMatch = /^\s*##\s+/m.exec(remainder);
  const endIndex = nextHeadingMatch
    ? startIndex + nextHeadingMatch.index
    : markdown.length;

  return markdown.slice(startIndex, endIndex).trim();
}

function getSectionLine(markdown, heading) {
  const prefix = markdown.slice(
    0,
    createHeadingMatcher(heading).exec(markdown)?.index ?? 0,
  );
  return prefix.split("\n").length;
}

function getLineFromOffset(text, offset) {
  return text.slice(0, offset).split("\n").length;
}

function parseMarkdownTable(sectionContent) {
  return sectionContent
    .split("\n")
    .filter((line) => line.trim().startsWith("|"))
    .map((line) => line.trim())
    .filter((line) => !/^\|\s*-/.test(line));
}

function getCellValue(row, columnIndex) {
  const cells = row
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
  return cells[columnIndex] ?? "";
}

function extractCanonicalDefinitions({
  baseDir = process.cwd(),
  relativePath,
  sectionHeading,
  familyKey,
  columnIndex = 0,
}) {
  const markdown = readMarkdownFile(relativePath, baseDir);
  const sectionContent = getSectionContent(markdown, sectionHeading);
  const rows = parseMarkdownTable(sectionContent);
  const issues = [];
  const definitions = new Map();
  const lineBase = getSectionLine(markdown, sectionHeading);

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const idCell = getCellValue(row, columnIndex).replace(/`/g, "");
    if (!idCell || /^(ID|Flow)$/i.test(idCell)) {
      continue;
    }

    const match = /^(FR|NFR|UF)-(\d{3})$/.exec(idCell);
    const line = lineBase + index + 1;

    if (!match) {
      issues.push(
        `${relativePath}:${line} section "${sectionHeading}" has malformed definition ID "${idCell}".`,
      );
      continue;
    }

    if (match[1] !== familyKey) {
      issues.push(
        `${relativePath}:${line} section "${sectionHeading}" mixes ${match[1]} into ${familyKey} definitions.`,
      );
      continue;
    }

    const numericId = Number(match[2]);
    const family = FAMILY_CONFIG[familyKey];
    if (numericId < family.min || numericId > family.max) {
      issues.push(
        `${relativePath}:${line} section "${sectionHeading}" defines out-of-bounds ID "${idCell}".`,
      );
      continue;
    }

    const existing = definitions.get(idCell) ?? [];
    existing.push(line);
    definitions.set(idCell, existing);
  }

  return { definitions, issues };
}

function stripCoveredRanges(sectionText) {
  return sectionText.replace(
    /`(FR|NFR|UF)-\d{3}`\s+to\s+`(FR|NFR|UF)-\d{3}`/g,
    "",
  );
}

function parseIdReferences(sectionText, { file, section, lineBase = 1 }) {
  const coverage = {
    FR: new Set(),
    NFR: new Set(),
    UF: new Set(),
  };
  const issues = [];

  const rangePattern = /`(FR|NFR|UF)-(\d{3})`\s+to\s+`(FR|NFR|UF)-(\d{3})`/g;
  for (const match of sectionText.matchAll(rangePattern)) {
    const [, startFamily, startValue, endFamily, endValue] = match;
    const snippet = match[0];
    const line = lineBase + getLineFromOffset(sectionText, match.index ?? 0);

    if (startFamily !== endFamily) {
      issues.push(
        `${file}:${line} section "${section}" has malformed range "${snippet}" across different families.`,
      );
      continue;
    }

    const family = FAMILY_CONFIG[startFamily];
    const startNumber = Number(startValue);
    const endNumber = Number(endValue);

    if (
      startNumber < family.min ||
      startNumber > family.max ||
      endNumber < family.min ||
      endNumber > family.max
    ) {
      issues.push(
        `${file}:${line} section "${section}" has out-of-bounds ${family.prefix} range "${snippet}".`,
      );
      continue;
    }

    if (endNumber < startNumber) {
      issues.push(
        `${file}:${line} section "${section}" has descending range "${snippet}".`,
      );
      continue;
    }

    for (let value = startNumber; value <= endNumber; value += 1) {
      coverage[startFamily].add(`${startFamily}-${padId(value)}`);
    }
  }

  const strippedText = stripCoveredRanges(sectionText);
  const singlePattern = /`(FR|NFR|UF)-(\d{3})`/g;
  for (const match of strippedText.matchAll(singlePattern)) {
    const [, familyKey, value] = match;
    const family = FAMILY_CONFIG[familyKey];
    const numericValue = Number(value);
    const formattedId = `${familyKey}-${value}`;
    const line = lineBase + getLineFromOffset(sectionText, match.index ?? 0);

    if (numericValue < family.min || numericValue > family.max) {
      issues.push(
        `${file}:${line} section "${section}" references out-of-bounds ID "${formattedId}".`,
      );
      continue;
    }

    coverage[familyKey].add(formattedId);
  }

  const malformedPattern = /`((?:FR|NFR|UF)-[^`]+)`/g;
  for (const match of strippedText.matchAll(malformedPattern)) {
    const token = match[1];
    const line = lineBase + getLineFromOffset(sectionText, match.index ?? 0);
    if (/^(FR|NFR|UF)-\d{3}$/.test(token)) {
      continue;
    }

    issues.push(
      `${file}:${line} section "${section}" has malformed requirement token "${token}".`,
    );
  }

  return { coverage, issues };
}

function mergeCoverage(target, source) {
  for (const familyKey of Object.keys(target)) {
    for (const id of source[familyKey]) {
      target[familyKey].add(id);
    }
  }
}

function validateCanonicalDefinitions(baseDir = process.cwd()) {
  const definitionSources = [
    {
      relativePath: CANONICAL_FILES.prd,
      sectionHeading: "Functional Requirements",
      familyKey: "FR",
    },
    {
      relativePath: CANONICAL_FILES.prd,
      sectionHeading: "Non-Functional Requirements",
      familyKey: "NFR",
    },
    {
      relativePath: CANONICAL_FILES.flows,
      sectionHeading: "Flow Index",
      familyKey: "UF",
    },
  ];

  const issues = [];

  for (const source of definitionSources) {
    const result = extractCanonicalDefinitions({ baseDir, ...source });
    issues.push(...result.issues);

    const expectedIds = getExpectedIds(source.familyKey);
    for (const expectedId of expectedIds) {
      const locations = result.definitions.get(expectedId) ?? [];
      if (locations.length === 0) {
        issues.push(
          `${source.relativePath} section "${source.sectionHeading}" is missing definition "${expectedId}".`,
        );
        continue;
      }

      if (locations.length > 1) {
        issues.push(
          `${source.relativePath} section "${source.sectionHeading}" defines "${expectedId}" more than once at lines ${locations.join(", ")}.`,
        );
      }
    }

    for (const definedId of result.definitions.keys()) {
      if (!expectedIds.includes(definedId)) {
        issues.push(
          `${source.relativePath} section "${source.sectionHeading}" contains unexpected ID "${definedId}".`,
        );
      }
    }
  }

  return issues;
}

function validatePlanningCoverage(baseDir = process.cwd()) {
  const coverageSources = [
    {
      relativePath: CANONICAL_FILES.epicMap,
      sectionHeading: "Epic Sequence",
    },
    {
      relativePath: CANONICAL_FILES.epicMap,
      sectionHeading: "Explicit Coverage Ledger",
    },
    {
      relativePath: CANONICAL_FILES.storyMap,
      sectionHeading: "Requirement And Flow Assignment",
    },
  ];

  const issues = [];
  const aggregateCoverage = {
    FR: new Set(),
    NFR: new Set(),
    UF: new Set(),
  };

  for (const source of coverageSources) {
    const markdown = readMarkdownFile(source.relativePath, baseDir);
    const sectionContent = getSectionContent(markdown, source.sectionHeading);
    const lineBase = getSectionLine(markdown, source.sectionHeading);
    const result = parseIdReferences(sectionContent, {
      file: source.relativePath,
      section: source.sectionHeading,
      lineBase,
    });

    issues.push(...result.issues);
    mergeCoverage(aggregateCoverage, result.coverage);
  }

  for (const familyKey of Object.keys(FAMILY_CONFIG)) {
    const expectedIds = getExpectedIds(familyKey);
    const missingIds = expectedIds.filter(
      (id) => !aggregateCoverage[familyKey].has(id),
    );
    if (missingIds.length > 0) {
      issues.push(
        `Planning maps are missing ${FAMILY_CONFIG[familyKey].label} coverage for: ${missingIds.join(", ")}.`,
      );
    }
  }

  return issues;
}

export function validatePlanningTraceability(baseDir = process.cwd()) {
  const issues = [
    ...validateCanonicalDefinitions(baseDir),
    ...validatePlanningCoverage(baseDir),
  ];

  return {
    ok: issues.length === 0,
    issues,
  };
}

export function runPlanningTraceabilityCheck(baseDir = process.cwd()) {
  const result = validatePlanningTraceability(baseDir);

  if (!result.ok) {
    console.error("Planning traceability check failed:");
    for (const issue of result.issues) {
      console.error(`- ${issue}`);
    }
    process.exitCode = 1;
    return result;
  }

  console.log("Planning traceability check passed.");
  return result;
}

const currentFilePath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";

if (invokedPath === currentFilePath) {
  runPlanningTraceabilityCheck();
}
