const STORAGE_KEY = "englishpath.toeic.writing.attempt";

export type WritingClientAttempt = {
  taskId: string;
  sessionId: string | null;
  startKey: string;
  submitKey: string;
  feedbackKey: string;
};

function newKey(prefix: string) {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${suffix}`;
}

function validKey(value: unknown, prefix: string): value is string {
  return (
    typeof value === "string" &&
    value.startsWith(`${prefix}-`) &&
    value.length > prefix.length + 1 &&
    value.length <= 200
  );
}

function valid(value: unknown): value is WritingClientAttempt {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const attempt = value as Record<string, unknown>;
  return (
    typeof attempt.taskId === "string" &&
    (attempt.sessionId === null || typeof attempt.sessionId === "string") &&
    validKey(attempt.startKey, "writing-start") &&
    validKey(attempt.submitKey, "writing-submit") &&
    validKey(attempt.feedbackKey, "writing-feedback")
  );
}

export function readWritingAttempt(): WritingClientAttempt | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "null",
    );
    if (valid(parsed)) return parsed;
    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      typeof (parsed as Record<string, unknown>).taskId === "string" &&
      ((parsed as Record<string, unknown>).sessionId === null ||
        typeof (parsed as Record<string, unknown>).sessionId === "string") &&
      validKey((parsed as Record<string, unknown>).startKey, "writing-start") &&
      validKey((parsed as Record<string, unknown>).submitKey, "writing-submit")
    ) {
      const migrated = {
        ...(parsed as Omit<WritingClientAttempt, "feedbackKey">),
        feedbackKey: newKey("writing-feedback"),
      };
      rememberWritingAttempt(migrated);
      return migrated;
    }
    return null;
  } catch {
    return null;
  }
}

export function createWritingAttempt(taskId: string): WritingClientAttempt {
  const attempt: WritingClientAttempt = {
    taskId,
    sessionId: null,
    startKey: newKey("writing-start"),
    submitKey: newKey("writing-submit"),
    feedbackKey: newKey("writing-feedback"),
  };
  rememberWritingAttempt(attempt);
  return attempt;
}

export function rememberWritingAttempt(attempt: WritingClientAttempt) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(attempt));
}

export function forgetWritingAttempt() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
