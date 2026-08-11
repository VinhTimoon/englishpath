const STORAGE_KEY = "englishpath.toeic.speaking.attempt";

export type SpeakingClientAttempt = {
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

function valid(value: unknown): value is SpeakingClientAttempt {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const attempt = value as Record<string, unknown>;
  return (
    typeof attempt.taskId === "string" &&
    (attempt.sessionId === null || typeof attempt.sessionId === "string") &&
    typeof attempt.startKey === "string" &&
    typeof attempt.submitKey === "string" &&
    typeof attempt.feedbackKey === "string"
  );
}

export function readSpeakingAttempt(): SpeakingClientAttempt | null {
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
      typeof (parsed as Record<string, unknown>).startKey === "string" &&
      typeof (parsed as Record<string, unknown>).submitKey === "string"
    ) {
      const migrated = {
        ...(parsed as Omit<SpeakingClientAttempt, "feedbackKey">),
        feedbackKey: newKey("speaking-feedback"),
      };
      rememberSpeakingAttempt(migrated);
      return migrated;
    }
    return null;
  } catch {
    return null;
  }
}

export function createSpeakingAttempt(taskId: string): SpeakingClientAttempt {
  const attempt = {
    taskId,
    sessionId: null,
    startKey: newKey("speaking-start"),
    submitKey: newKey("speaking-submit"),
    feedbackKey: newKey("speaking-feedback"),
  };
  rememberSpeakingAttempt(attempt);
  return attempt;
}

export function rememberSpeakingAttempt(attempt: SpeakingClientAttempt) {
  if (typeof window !== "undefined")
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(attempt));
}

export function forgetSpeakingAttempt() {
  if (typeof window !== "undefined")
    window.localStorage.removeItem(STORAGE_KEY);
}
