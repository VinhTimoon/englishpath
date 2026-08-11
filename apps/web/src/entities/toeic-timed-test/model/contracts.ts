export type TimedMode = "MINI" | "HALF" | "FULL";
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
export type TimedAnalysisAggregate = {
  total: number;
  answered: number;
  correct: number;
  accuracy: number;
};

export type TimedAnalysis = {
  score: Omit<TimedAnalysisAggregate, "accuracy">;
  accuracy: number;
  skills: Array<TimedAnalysisAggregate & { skill: "LISTENING" | "READING" }>;
  parts: Array<
    TimedAnalysisAggregate & { part: `PART_${1 | 2 | 3 | 4 | 5 | 6 | 7}` }
  >;
  weaknesses: Array<{
    scope: "part" | "skill";
    name: string;
    accuracy: number;
    answered: number;
  }>;
  time: {
    limitSeconds: number;
    usedSeconds: number;
    remainingSeconds: number;
    averageSecondsPerAnswered: number;
  };
  remediation: {
    status: "ready" | "empty" | "unavailable";
    count: number;
    href: "/error-notebook?source=TOEIC_TIMED_TEST" | null;
    packs: Array<{
      kind: "VOCABULARY" | "GRAMMAR" | "PRACTICE";
      title: string;
      description: string;
      href: string;
      relatedLabel?: string;
    }>;
  };
};

export const TIMED_TEST_SHAPE: Record<
  TimedMode,
  { total: number; minutes: number }
> = {
  MINI: { total: 20, minutes: 20 },
  HALF: { total: 50, minutes: 45 },
  FULL: { total: 200, minutes: 120 },
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
    !hasOnlyKeys(question, ["id", "prompt", "options"]) ||
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
      !hasOnlyKeys(option, ["id", "text"]) ||
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
    mode === "MINI" || mode === "HALF" || mode === "FULL"
      ? TIMED_TEST_SHAPE[mode]
      : null;
  const rawQuestions = data?.questions;
  const questions = Array.isArray(rawQuestions)
    ? rawQuestions.map(parseQuestion)
    : [];

  if (
    !session ||
    !hasOnlyKeys(root, ["data", "meta"]) ||
    !hasOnlyKeys(data, ["session", "questions"]) ||
    !hasOnlyKeys(session, [
      "sessionId",
      "mode",
      "status",
      "total",
      "answered",
      "startedAt",
      "deadlineAt",
      "remainingSeconds",
      "score",
    ]) ||
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
    (session.status === "ACTIVE" && "score" in session) ||
    ("score" in session &&
      session.score !== null &&
      (typeof session.score !== "number" || !Number.isFinite(session.score))) ||
    ("startedAt" in session &&
      session.startedAt !== undefined &&
      !nonEmptyString(session.startedAt)) ||
    ("deadlineAt" in session &&
      session.deadlineAt !== undefined &&
      !nonEmptyString(session.deadlineAt))
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

const analysisForbiddenKeys = new Set([
  "correctAnswer",
  "isCorrect",
  "selectedOption",
  "answers",
  "questionId",
  "sessionId",
  "userId",
  "source",
  "license",
  "review",
  "publication",
  "provider",
]);

function hasAnalysisForbiddenKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasAnalysisForbiddenKey);
  const object = record(value);
  if (!object) return false;
  return Object.entries(object).some(
    ([key, child]) =>
      analysisForbiddenKeys.has(key) || hasAnalysisForbiddenKey(child),
  );
}

function hasOnlyKeys(
  value: Record<string, unknown> | null,
  allowed: readonly string[],
): boolean {
  return !!value && Object.keys(value).every((key) => allowed.includes(key));
}

function boundedPercentage(value: unknown): value is number {
  return integer(value) && value >= 0 && value <= 100;
}

function parseAnalysisAggregate(value: unknown): TimedAnalysisAggregate | null {
  const aggregate = record(value);
  if (
    !aggregate ||
    !integer(aggregate.total) ||
    aggregate.total < 1 ||
    !integer(aggregate.answered) ||
    aggregate.answered < 0 ||
    aggregate.answered > aggregate.total ||
    !integer(aggregate.correct) ||
    aggregate.correct < 0 ||
    aggregate.correct > aggregate.answered ||
    !boundedPercentage(aggregate.accuracy)
  ) {
    return null;
  }
  return {
    total: aggregate.total,
    answered: aggregate.answered,
    correct: aggregate.correct,
    accuracy: aggregate.accuracy,
  };
}

function parseAnalysisScore(value: unknown): TimedAnalysis["score"] | null {
  const score = record(value);
  if (
    !score ||
    !integer(score.total) ||
    score.total < 1 ||
    !integer(score.answered) ||
    score.answered < 0 ||
    score.answered > score.total ||
    !integer(score.correct) ||
    score.correct < 0 ||
    score.correct > score.answered
  ) {
    return null;
  }
  return {
    total: score.total,
    answered: score.answered,
    correct: score.correct,
  };
}

function parseRemediation(value: unknown): TimedAnalysis["remediation"] {
  const remediation = record(value);
  if (!remediation) {
    return { status: "unavailable", count: 0, href: null, packs: [] };
  }
  const status = remediation.status;
  const count = remediation.count;
  const href = remediation.href;
  const rawPacks = remediation.packs;
  const packs =
    rawPacks === undefined
      ? []
      : Array.isArray(rawPacks)
        ? rawPacks.map((value) => {
            const pack = record(value);
            if (
              !pack ||
              !hasOnlyKeys(pack, [
                "kind",
                "title",
                "description",
                "href",
                "relatedLabel",
              ]) ||
              !["VOCABULARY", "GRAMMAR", "PRACTICE"].includes(
                String(pack.kind),
              ) ||
              !nonEmptyString(pack.title) ||
              !nonEmptyString(pack.description) ||
              typeof pack.href !== "string" ||
              (pack.relatedLabel !== undefined &&
                !nonEmptyString(pack.relatedLabel))
            ) {
              return null;
            }
            const hrefAllowed =
              pack.kind === "VOCABULARY"
                ? /^\/vocabulary(?:\?|$)/u.test(pack.href)
                : pack.kind === "GRAMMAR"
                  ? /^\/blog\/[a-z0-9-]+$/u.test(pack.href)
                  : /^\/toeic\/practice\?(?:mode=(?:listening|reading)&part=PART_[1-7])$/u.test(
                      pack.href,
                    );
            if (!hrefAllowed) return null;
            return {
              kind: pack.kind as "VOCABULARY" | "GRAMMAR" | "PRACTICE",
              title: pack.title.trim(),
              description: pack.description.trim(),
              href: pack.href,
              ...(nonEmptyString(pack.relatedLabel)
                ? { relatedLabel: pack.relatedLabel.trim() }
                : {}),
            };
          })
        : null;
  if (
    (status !== "ready" && status !== "empty" && status !== "unavailable") ||
    !integer(count) ||
    count < 0 ||
    (href !== null && href !== "/error-notebook?source=TOEIC_TIMED_TEST") ||
    (status === "ready" && (count < 1 || href === null)) ||
    (status !== "ready" && (count !== 0 || href !== null)) ||
    !packs ||
    packs.length > 6 ||
    packs.some((pack) => pack === null) ||
    new Set(
      packs
        .filter((pack): pack is NonNullable<typeof pack> => pack !== null)
        .map((pack) => pack.href),
    ).size !== packs.length
  ) {
    throw new Error("INVALID_RESPONSE");
  }
  return {
    status,
    count,
    href,
    packs: packs as TimedAnalysis["remediation"]["packs"],
  };
}

export function parseTimedAnalysis(value: unknown): TimedAnalysis | null {
  const root = record(value);
  const data = record(root?.data);
  const analysis = record(data?.analysis);
  const remediation = parseRemediation(data?.remediation);
  if (root && data && analysis === null) return null;
  const score = parseAnalysisScore(analysis?.score);
  const time = record(analysis?.time);
  const rawSkills = analysis?.skills;
  const rawParts = analysis?.parts;
  const rawWeaknesses = analysis?.weaknesses;
  const skills = Array.isArray(rawSkills)
    ? rawSkills.map((value) => {
        const item = record(value);
        const aggregate = parseAnalysisAggregate(value);
        return item &&
          aggregate &&
          (item.skill === "LISTENING" || item.skill === "READING")
          ? { ...aggregate, skill: item.skill }
          : null;
      })
    : [];
  const parts = Array.isArray(rawParts)
    ? rawParts.map((value) => {
        const item = record(value);
        const aggregate = parseAnalysisAggregate(value);
        return item &&
          aggregate &&
          typeof item.part === "string" &&
          /^PART_[1-7]$/u.test(item.part)
          ? {
              ...aggregate,
              part: item.part as TimedAnalysis["parts"][number]["part"],
            }
          : null;
      })
    : [];
  const weaknesses = Array.isArray(rawWeaknesses)
    ? rawWeaknesses.map((value) => {
        const item = record(value);
        return item &&
          (item.scope === "part" || item.scope === "skill") &&
          nonEmptyString(item.name) &&
          boundedPercentage(item.accuracy) &&
          integer(item.answered) &&
          item.answered > 0
          ? {
              scope: item.scope,
              name: item.name.trim(),
              accuracy: item.accuracy,
              answered: item.answered,
            }
          : null;
      })
    : [];

  if (
    !analysis ||
    !hasOnlyKeys(root, ["data", "meta"]) ||
    !hasOnlyKeys(data, ["analysis", "remediation"]) ||
    (record(root?.meta) !== null &&
      !hasOnlyKeys(record(root?.meta), [
        "correlationId",
        "idempotencyStatus",
      ])) ||
    !hasOnlyKeys(analysis, [
      "score",
      "accuracy",
      "skills",
      "parts",
      "weaknesses",
      "time",
    ]) ||
    !hasOnlyKeys(score, ["correct", "total", "answered"]) ||
    (Array.isArray(rawSkills) &&
      rawSkills.some(
        (item) =>
          !hasOnlyKeys(record(item), [
            "skill",
            "total",
            "answered",
            "correct",
            "accuracy",
          ]),
      )) ||
    (Array.isArray(rawParts) &&
      rawParts.some(
        (item) =>
          !hasOnlyKeys(record(item), [
            "part",
            "total",
            "answered",
            "correct",
            "accuracy",
          ]),
      )) ||
    (Array.isArray(rawWeaknesses) &&
      rawWeaknesses.some(
        (item) =>
          !hasOnlyKeys(record(item), ["scope", "name", "accuracy", "answered"]),
      )) ||
    !hasOnlyKeys(record(data?.remediation), [
      "status",
      "count",
      "href",
      "packs",
    ]) ||
    !hasOnlyKeys(time, [
      "limitSeconds",
      "usedSeconds",
      "remainingSeconds",
      "averageSecondsPerAnswered",
    ]) ||
    hasAnalysisForbiddenKey(value) ||
    !score ||
    !boundedPercentage(analysis.accuracy) ||
    skills.length !== 2 ||
    skills.some((item) => item === null) ||
    new Set(
      skills
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .map((item) => item.skill),
    ).size !== 2 ||
    parts.length === 0 ||
    parts.some((item) => item === null) ||
    weaknesses.some((item) => item === null) ||
    !time ||
    !integer(time.limitSeconds) ||
    time.limitSeconds < 1 ||
    !integer(time.usedSeconds) ||
    time.usedSeconds < 0 ||
    time.usedSeconds > time.limitSeconds ||
    !integer(time.remainingSeconds) ||
    time.remainingSeconds < 0 ||
    time.remainingSeconds > time.limitSeconds ||
    time.remainingSeconds !== time.limitSeconds - time.usedSeconds ||
    typeof time.averageSecondsPerAnswered !== "number" ||
    !Number.isFinite(time.averageSecondsPerAnswered) ||
    time.averageSecondsPerAnswered < 0
  ) {
    throw new Error("INVALID_RESPONSE");
  }

  return {
    score,
    accuracy: analysis.accuracy,
    skills: skills as TimedAnalysis["skills"],
    parts: parts as TimedAnalysis["parts"],
    weaknesses: weaknesses as TimedAnalysis["weaknesses"],
    time: {
      limitSeconds: time.limitSeconds,
      usedSeconds: time.usedSeconds,
      remainingSeconds: time.remainingSeconds,
      averageSecondsPerAnswered: time.averageSecondsPerAnswered,
    },
    remediation,
  };
}

export function formatRemaining(seconds: number): string {
  const safe = Math.max(0, seconds);
  return `${Math.floor(safe / 60)
    .toString()
    .padStart(2, "0")}:${(safe % 60).toString().padStart(2, "0")}`;
}
