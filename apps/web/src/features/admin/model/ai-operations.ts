export type AiOperations = {
  role: "CONTENT_EDITOR" | "ADMIN" | "SUPER_ADMIN";
  window: { start: string; end: string; hours: 24 };
  totals: {
    requests: number;
    allowed: number;
    denied: number;
    unavailable: number;
    quotaDenials: number;
    estimatedCostMicros: number;
  };
  featureSummary: Array<{ key: string; count: number }>;
  skillSummary: Array<{ key: string; count: number }>;
  replayed: { state: "unavailable" };
  abuse: { state: "unavailable" };
};

const ROLES = new Set<AiOperations["role"]>([
  "CONTENT_EDITOR",
  "ADMIN",
  "SUPER_ADMIN",
]);
const GROUP_KEYS = new Set(["SPEAKING", "WRITING", "EXPLANATION"]);

function exactKeys(value: Record<string, unknown>, keys: string[]) {
  return Object.keys(value).sort().join(",") === [...keys].sort().join(",");
}

function safeCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function safeIso(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function safeGroups(
  value: unknown,
): value is Array<{ key: string; count: number }> {
  if (!Array.isArray(value)) return false;
  const seen = new Set<string>();
  return value.every((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry))
      return false;
    const group = entry as Record<string, unknown>;
    if (!exactKeys(group, ["key", "count"])) return false;
    if (
      typeof group.key !== "string" ||
      !GROUP_KEYS.has(group.key) ||
      seen.has(group.key)
    )
      return false;
    if (!safeCount(group.count)) return false;
    seen.add(group.key);
    return true;
  });
}

export function isAiOperations(value: unknown): value is AiOperations {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  const t = v.totals as Record<string, unknown> | undefined;
  const w = v.window as Record<string, unknown> | undefined;
  if (
    !exactKeys(v, [
      "role",
      "window",
      "totals",
      "featureSummary",
      "skillSummary",
      "replayed",
      "abuse",
    ])
  )
    return false;
  if (
    !t ||
    !w ||
    typeof t !== "object" ||
    typeof w !== "object" ||
    Array.isArray(t) ||
    Array.isArray(w)
  )
    return false;
  if (
    !exactKeys(w, ["start", "end", "hours"]) ||
    w.hours !== 24 ||
    !safeIso(w.start) ||
    !safeIso(w.end) ||
    Date.parse(w.end) - Date.parse(w.start) !== 24 * 60 * 60 * 1000
  )
    return false;
  if (
    !exactKeys(t, [
      "requests",
      "allowed",
      "denied",
      "unavailable",
      "quotaDenials",
      "estimatedCostMicros",
    ]) ||
    ![
      "requests",
      "allowed",
      "denied",
      "unavailable",
      "quotaDenials",
      "estimatedCostMicros",
    ].every((k) => safeCount(t[k]))
  )
    return false;
  const allowed = t.allowed as number;
  const denied = t.denied as number;
  const unavailable = t.unavailable as number;
  const requests = t.requests as number;
  const quotaDenials = t.quotaDenials as number;
  if (!ROLES.has(v.role as AiOperations["role"]) || quotaDenials !== denied)
    return false;
  if (
    (allowed as number) + (denied as number) + (unavailable as number) !==
    (requests as number)
  )
    return false;
  if (!safeGroups(v.featureSummary) || !safeGroups(v.skillSummary))
    return false;
  const replayed = v.replayed as Record<string, unknown>;
  const abuse = v.abuse as Record<string, unknown>;
  return (
    !!replayed &&
    !!abuse &&
    !Array.isArray(replayed) &&
    !Array.isArray(abuse) &&
    exactKeys(replayed, ["state"]) &&
    exactKeys(abuse, ["state"]) &&
    replayed.state === "unavailable" &&
    abuse.state === "unavailable"
  );
}
