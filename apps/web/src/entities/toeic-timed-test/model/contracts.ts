export type TimedMode = "MINI" | "HALF";
export type TimedStatus = "ACTIVE" | "SUBMITTED" | "EXPIRED";

export type TimedOption = { id: string; text: string };

export type TimedQuestion = {
  id: string;
  prompt: string;
  options: TimedOption[];
};

export type TimedSession = {
  sessionId: string;
  mode: TimedMode;
  status: TimedStatus;
  total: number;
  answered: number;
  startedAt?: string;
  deadlineAt?: string;
  remainingSeconds: number;
  questions: TimedQuestion[];
  score?: number | null;
};

export type TimedAnswerAcknowledgement = {
  accepted: true;
  replayed: boolean;
  questionId: string;
  answered: number;
  total: number;
};

export const TIMED_TEST_SHAPE: Record<
  TimedMode,
  { total: number; minutes: number }
> = {
  MINI: { total: 20, minutes: 20 },
  HALF: { total: 50, minutes: 45 },
};

const forbiddenKeys = new Set([
  "correctAnswer",
  "isCorrect",
  "selectedOption",
  "source",
  "license",
  "review",
  "publication",
  "provider",
]);

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function hasForbiddenKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasForbiddenKey);
  const object = record(value);
  if (!object) return false;
  return Object.entries(object).some(
    ([key, child]) => forbiddenKeys.has(key) || hasForbiddenKey(child),
  );
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function integer(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function parseQuestion(value: unknown): TimedQuestion | null {
  const question = record(value);
  if (
    !question ||
    !nonEmptyString(question.id) ||
    !nonEmptyString(question.prompt) ||
    !Array.isArray(question.options) ||
    question.options.length < 2 ||
    question.options.length > 6
  ) {
    return null;
  }

  const seen = new Set<string>();
  const options = question.options.map((value) => {
    const option = record(value);
    if (
      !option ||
      !nonEmptyString(option.id) ||
      !nonEmptyString(option.text) ||
      seen.has(option.id)
    ) {
      return null;
    }
    seen.add(option.id);
    return { id: option.id, text: option.text.trim() };
  });

  return options.every(Boolean)
    ? {
        id: question.id,
        prompt: question.prompt.trim(),
        options: options as TimedOption[],
      }
    : null;
}

export function parseTimedSession(value: unknown): TimedSession {
  const root = record(value);
  const data = record(root?.data);
  const session = record(data?.session);
  const mode = session?.mode;
  const shape =
    mode === "MINI" || mode === "HALF" ? TIMED_TEST_SHAPE[mode] : null;
  const rawQuestions = data?.questions;
  const questions = Array.isArray(rawQuestions)
    ? rawQuestions.map(parseQuestion)
    : [];

  if (
    !session ||
    hasForbiddenKey(value) ||
    !shape ||
    !nonEmptyString(session.sessionId) ||
    !["ACTIVE", "SUBMITTED", "EXPIRED"].includes(String(session.status)) ||
    !integer(session.total) ||
    session.total !== shape.total ||
    !integer(session.answered) ||
    session.answered < 0 ||
    session.answered > session.total ||
    !integer(session.remainingSeconds) ||
    session.remainingSeconds < 0 ||
    questions.some((question) => question === null) ||
    (session.status === "ACTIVE" && questions.length !== session.total) ||
    (session.status !== "ACTIVE" && questions.length !== 0) ||
    (session.status === "ACTIVE" && "score" in session)
  ) {
    throw new Error("INVALID_RESPONSE");
  }

  return {
    sessionId: session.sessionId,
    mode: mode as TimedMode,
    status: session.status as TimedStatus,
    total: session.total,
    answered: session.answered,
    remainingSeconds: session.remainingSeconds,
    questions: questions as TimedQuestion[],
    ...(nonEmptyString(session.startedAt)
      ? { startedAt: session.startedAt }
      : {}),
    ...(nonEmptyString(session.deadlineAt)
      ? { deadlineAt: session.deadlineAt }
      : {}),
    ...(typeof session.score === "number" || session.score === null
      ? { score: session.score }
      : {}),
  };
}

export function parseTimedAnswer(value: unknown): TimedAnswerAcknowledgement {
  const root = record(value);
  const data = record(root?.data);
  if (
    !data ||
    hasForbiddenKey(value) ||
    data.accepted !== true ||
    typeof data.replayed !== "boolean" ||
    !nonEmptyString(data.questionId) ||
    !integer(data.answered) ||
    !integer(data.total) ||
    data.answered < 1 ||
    data.total < data.answered
  ) {
    throw new Error("INVALID_RESPONSE");
  }
  return {
    accepted: true,
    replayed: data.replayed,
    questionId: data.questionId,
    answered: data.answered,
    total: data.total,
  };
}

export function formatRemaining(seconds: number): string {
  const safe = Math.max(0, seconds);
  return `${Math.floor(safe / 60)
    .toString()
    .padStart(2, "0")}:${(safe % 60).toString().padStart(2, "0")}`;
}
