import fs from "node:fs";
import path from "node:path";

export const STORY_ROOT = "stories";
export const STORY_LIFECYCLE_DIRS = {
  ready: "stories/ready",
  "in-progress": "stories/in-progress",
  review: "stories/review",
  blocked: "stories/blocked",
  done: "stories/done",
};

const REQUIRED_FRONTMATTER_FIELDS = [
  "id",
  "title",
  "status",
  "type",
  "allowed_paths",
  "forbidden_paths",
  "max_fix_rounds",
];

const REQUIRED_SECTIONS = ["## Goal", "## Acceptance Criteria", "## Verification"];

export function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function parseFrontmatter(content) {
  if (!content.startsWith("---\n") && !content.startsWith("---\r\n")) {
    throw new Error("Story is missing frontmatter.");
  }

  const lines = content.split(/\r?\n/u);
  let cursor = 1;
  const frontmatter = {};

  while (cursor < lines.length) {
    const line = lines[cursor];
    if (line === "---") {
      cursor += 1;
      break;
    }

    if (!line.trim()) {
      cursor += 1;
      continue;
    }

    const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/u);
    if (!keyMatch) {
      throw new Error(`Invalid frontmatter line: ${line}`);
    }

    const [, key, rawValue] = keyMatch;
    if (rawValue === "") {
      const values = [];
      cursor += 1;
      while (cursor < lines.length) {
        const listLine = lines[cursor];
        const listMatch = listLine.match(/^\s*-\s+(.*)$/u);
        if (!listMatch) {
          break;
        }
        values.push(listMatch[1]);
        cursor += 1;
      }
      frontmatter[key] = values;
      continue;
    }

    if (rawValue === "true" || rawValue === "false") {
      frontmatter[key] = rawValue === "true";
    } else if (/^-?\d+$/u.test(rawValue)) {
      frontmatter[key] = Number.parseInt(rawValue, 10);
    } else {
      frontmatter[key] = rawValue;
    }

    cursor += 1;
  }

  return { frontmatter, body: lines.slice(cursor).join("\n") };
}

export function stringifyFrontmatter(frontmatter) {
  const lines = ["---"];
  for (const [key, value] of Object.entries(frontmatter)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const entry of value) {
        lines.push(`  - ${entry}`);
      }
      continue;
    }
    lines.push(`${key}: ${value}`);
  }
  lines.push("---");
  return `${lines.join("\n")}\n`;
}

export function parseStoryFile(storyFile) {
  const content = fs.readFileSync(storyFile, "utf8");
  const { frontmatter, body } = parseFrontmatter(content);
  return {
    filePath: storyFile,
    fileName: path.basename(storyFile),
    content,
    frontmatter,
    body,
  };
}

export function getLifecycleFromPath(storyFile) {
  const normalized = storyFile.replace(/\\/g, "/");
  const segments = normalized.split("/").filter(Boolean);
  const storiesIndex = segments.lastIndexOf("stories");
  if (storiesIndex === -1 || storiesIndex + 1 >= segments.length) {
    return null;
  }

  return segments[storiesIndex + 1];
}

export function getExpectedStatusForPath(storyFile) {
  const lifecycle = getLifecycleFromPath(storyFile);
  if (!lifecycle) {
    return null;
  }

  return Object.keys(STORY_LIFECYCLE_DIRS).find(
    (status) => STORY_LIFECYCLE_DIRS[status].replace(/\\/g, "/") === `stories/${lifecycle}`
  );
}

export function validateStory(storyFile) {
  const story = parseStoryFile(storyFile);
  const issues = [];

  for (const field of REQUIRED_FRONTMATTER_FIELDS) {
    if (!(field in story.frontmatter)) {
      issues.push(`Missing required frontmatter field: ${field}`);
    }
  }

  for (const section of REQUIRED_SECTIONS) {
    if (!story.body.includes(section)) {
      issues.push(`Missing required section: ${section}`);
    }
  }

  const expectedStatus = getExpectedStatusForPath(storyFile);
  if (!expectedStatus) {
    issues.push(`Story must live under ${STORY_ROOT}/<lifecycle>/`);
  } else if (story.frontmatter.status !== expectedStatus) {
    issues.push(`Story status "${story.frontmatter.status}" does not match lifecycle folder "${expectedStatus}".`);
  }

  if (!Array.isArray(story.frontmatter.allowed_paths) || story.frontmatter.allowed_paths.length === 0) {
    issues.push("allowed_paths must be a non-empty list.");
  }

  if (!Array.isArray(story.frontmatter.forbidden_paths) || story.frontmatter.forbidden_paths.length === 0) {
    issues.push("forbidden_paths must be a non-empty list.");
  }

  if (!Number.isInteger(story.frontmatter.max_fix_rounds) || story.frontmatter.max_fix_rounds < 0) {
    issues.push("max_fix_rounds must be an integer greater than or equal to 0.");
  }

  return { story, issues };
}

export function validateStoryReadyForLoopStart(storyFile) {
  const { story, issues } = validateStory(storyFile);
  if (story.frontmatter.status !== "ready") {
    issues.push(`Story doctor only approves ready stories for loop start. Current status: ${story.frontmatter.status}.`);
  }

  return { story, issues };
}

export function writeStoryFile(storyFile, frontmatter, body) {
  const content = `${stringifyFrontmatter(frontmatter)}\n${body.trimStart()}\n`;
  fs.writeFileSync(storyFile, content);
}

export function moveStoryToStatus(storyFile, status) {
  const targetDir = STORY_LIFECYCLE_DIRS[status];
  if (!targetDir) {
    throw new Error(`Unsupported story status: ${status}`);
  }

  ensureDir(targetDir);

  const story = parseStoryFile(storyFile);
  const targetFile = path.join(targetDir, story.fileName);

  if (path.resolve(storyFile) !== path.resolve(targetFile)) {
    fs.renameSync(storyFile, targetFile);
  }

  writeStoryFile(targetFile, { ...story.frontmatter, status }, story.body);
  return targetFile;
}

export function findStoryFile(storyFileName) {
  for (const dir of Object.values(STORY_LIFECYCLE_DIRS)) {
    const candidate = path.join(dir, storyFileName);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}


export function findStoryByFileName(fileName) {
  for (const status of Object.keys(STORY_LIFECYCLE_DIRS)) {
    const candidate = path.join(STORY_LIFECYCLE_DIRS[status], fileName);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}
