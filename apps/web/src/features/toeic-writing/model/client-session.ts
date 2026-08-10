const STORAGE_KEY = "englishpath.toeic.writing.attempt";

export type WritingClientAttempt = {
  taskId: string;
  sessionId: string | null;
  startKey: string;
  submitKey: string;
};

function newKey(prefix: string) {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${suffix}`;
}

function valid(value: unknown): value is WritingClientAttempt {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const attempt = value as Record<string, unknown>;
  return (
    typeof attempt.taskId === "string" &&
    (attempt.sessionId === null || typeof attempt.sessionId === "string") &&
    typeof attempt.startKey === "string" &&
    typeof attempt.submitKey === "string"
  );
}

export function readWritingAttempt(): WritingClientAttempt | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "null",
    );
    return valid(parsed) ? parsed : null;
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
