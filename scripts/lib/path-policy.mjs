const SPECIAL_REGEX = /[|\\{}()[\]^$+?.]/g;

export function normalizePath(filePath) {
  return filePath.replace(/\\/g, "/").replace(/^\.\//u, "").replace(/^\/+|\/+$/gu, "");
}

export function globToRegExp(glob) {
  const normalized = normalizePath(glob);
  let pattern = "";

  for (let index = 0; index < normalized.length; index += 1) {
    const current = normalized[index];
    const next = normalized[index + 1];

    if (current === "*" && next === "*") {
      const nextNext = normalized[index + 2];
      if (nextNext === "/") {
        pattern += "(?:.*/)?";
        index += 2;
      } else {
        pattern += ".*";
        index += 1;
      }
      continue;
    }

    if (current === "*") {
      pattern += "[^/]*";
      continue;
    }

    pattern += current.replace(SPECIAL_REGEX, "\\$&");
  }

  return new RegExp(`^${pattern}$`, "u");
}

export function matchesGlob(filePath, glob) {
  return globToRegExp(glob).test(normalizePath(filePath));
}

export function evaluatePathPolicy(files, allowedPaths, forbiddenPaths, options = {}) {
  const ignored = new Set((options.ignoredPaths ?? []).map(normalizePath));
  const allowed = allowedPaths.map(normalizePath);
  const forbidden = forbiddenPaths.map(normalizePath);

  return files
    .map(normalizePath)
    .filter(Boolean)
    .filter((file) => !ignored.has(file))
    .map((file) => {
      const forbiddenMatch = forbidden.find((pattern) => matchesGlob(file, pattern));
      const allowedMatch = allowed.find((pattern) => matchesGlob(file, pattern));

      if (forbiddenMatch) {
        return { file, ok: false, reason: `matches forbidden path pattern "${forbiddenMatch}"` };
      }

      if (!allowedMatch) {
        return { file, ok: false, reason: "is outside allowed_paths" };
      }

      return { file, ok: true, reason: `matches allowed path pattern "${allowedMatch}"` };
    });
}
