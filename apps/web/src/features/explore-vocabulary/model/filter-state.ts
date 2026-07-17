export type VocabularyFilters = {
  level?: string;
  track?: string;
  skill?: string;
  toeicPart?: string;
  rootId?: string;
  depth: string;
};

const allowedLevels = new Set([
  "daily-basic",
  "common-communication",
  "toeic-core",
  "workplace-english",
  "advanced-toeic",
  "academic-professional",
]);
const token = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function parseVocabularyFilters(
  params: URLSearchParams,
): VocabularyFilters {
  const level = params.get("level") ?? undefined;
  const track = params.get("track") ?? undefined;
  const skill = params.get("skill") ?? undefined;
  const toeicPart = params.get("toeicPart") ?? undefined;
  const rootId = params.get("rootId") ?? undefined;
  const depth = params.get("depth") ?? "3";
  return {
    level: level && allowedLevels.has(level) ? level : undefined,
    track: track && track.length <= 64 && token.test(track) ? track : undefined,
    skill: skill && skill.length <= 32 && token.test(skill) ? skill : undefined,
    toeicPart: toeicPart && /^[1-7]$/.test(toeicPart) ? toeicPart : undefined,
    rootId:
      rootId && rootId.length <= 96 && token.test(rootId) ? rootId : undefined,
    depth: /^[1-3]$/.test(depth) ? depth : "3",
  };
}

export function filtersToParams(filters: VocabularyFilters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value && !(key === "depth" && value === "3")) params.set(key, value);
  }
  return params;
}

export function dataQuery(filters: VocabularyFilters, includeTree = false) {
  const params = filtersToParams(filters);
  if (!includeTree) {
    params.delete("rootId");
    params.delete("depth");
    params.set("page", "1");
    params.set("size", "50");
  }
  return params.toString();
}
