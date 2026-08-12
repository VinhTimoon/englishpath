export type WritingTask = {
  id: string;
  skill: "WRITING";
  taskType: string;
  version: string;
  promptKind: "TEXT";
  responseMode: "TEXT";
  instruction: string;
  prompt: string;
  minWords?: number;
  maxWords?: number;
};

export type WritingSubmission = {
  submissionId: string;
  responseMode: "TEXT";
  wordCount: number;
  characterCount: number;
  submittedAt: string;
};

export type WritingSession = {
  sessionId: string;
  status: "ACTIVE" | "FINALIZED" | "CANCELLED";
  task: WritingTask;
  startedAt: string;
  finalizedAt: string | null;
  submission: WritingSubmission | null;
};

export type WritingSessionResult = {
  session: WritingSession;
  replayed: boolean;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
) {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function date(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function nonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

export type WritingFeedback = {
  advisoryOnly: true;
  summary: string;
  strengths: string[];
  nextSteps: string[];
};

export type WritingFeedbackResult = {
  outcome: "ALLOWED" | "PROVIDER_UNAVAILABLE" | "DENIED";
  policyVersion: string;
  promptVersion: string;
  feature: "WRITING";
  skill: "WRITING";
  quotaRemaining: number;
  feedback: WritingFeedback | null;
  replayed: boolean;
};

const UNSAFE_FEEDBACK_TEXT =
  /provider|credential|secret|api[-_ ]?key|token|rubric|official score|raw response|\b(?:score|scored|points?|grade|graded|correct|incorrect|right|wrong|model|progress|rating)\b|\d+\s*\/\s*\d+|(?:điểm\s*(?:số|của bạn)|chấm\s*điểm|mô\s*hình|tiến\s*bộ)|(?:selected|chosen|your)\s+(?:answer|option|choice)|(?:raw|full|verbatim)\s+submission/i;

function boundedText(value: unknown, maximum: number): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maximum &&
    !UNSAFE_FEEDBACK_TEXT.test(value)
  );
}

function parseWritingAdvisory(value: unknown): WritingFeedback | null {
  const feedback = record(value);
  if (
    !feedback ||
    !hasOnlyKeys(feedback, [
      "advisoryOnly",
      "summary",
      "strengths",
      "nextSteps",
    ]) ||
    feedback.advisoryOnly !== true ||
    !boundedText(feedback.summary, 500)
  ) {
    return null;
  }
  const boundedList = (candidate: unknown): candidate is string[] =>
    Array.isArray(candidate) &&
    candidate.length <= 3 &&
    candidate.every((item) => boundedText(item, 200));
  if (!boundedList(feedback.strengths) || !boundedList(feedback.nextSteps)) {
    return null;
  }
  return {
    advisoryOnly: true,
    summary: feedback.summary,
    strengths: [...feedback.strengths],
    nextSteps: [...feedback.nextSteps],
  };
}

export function parseWritingFeedback(value: unknown): WritingFeedbackResult {
  const root = record(value);
  const data = record(root?.data);
  if (
    !root ||
    !hasOnlyKeys(root, ["data", "meta"]) ||
    !safeFeedbackMeta(root.meta) ||
    !data ||
    !hasOnlyKeys(data, ["feedback", "replayed"]) ||
    typeof data.replayed !== "boolean"
  ) {
    throw new Error("INVALID_RESPONSE");
  }

  const envelope = record(data.feedback);
  if (
    !envelope ||
    !hasOnlyKeys(envelope, [
      "outcome",
      "policyVersion",
      "promptVersion",
      "feature",
      "skill",
      "quotaRemaining",
      "feedback",
    ]) ||
    !["ALLOWED", "PROVIDER_UNAVAILABLE", "DENIED"].includes(
      String(envelope.outcome),
    ) ||
    !boundedText(envelope.policyVersion, 100) ||
    !boundedText(envelope.promptVersion, 100) ||
    envelope.feature !== "WRITING" ||
    envelope.skill !== "WRITING" ||
    !nonNegativeInteger(envelope.quotaRemaining)
  ) {
    throw new Error("INVALID_RESPONSE");
  }

  const feedback =
    envelope.feedback === null ? null : parseWritingAdvisory(envelope.feedback);
  if (
    (envelope.feedback !== null && !feedback) ||
    (envelope.outcome === "ALLOWED") !== Boolean(feedback) ||
    (envelope.outcome !== "ALLOWED" && envelope.feedback !== null)
  ) {
    throw new Error("INVALID_RESPONSE");
  }

  return {
    outcome: envelope.outcome as WritingFeedbackResult["outcome"],
    policyVersion: envelope.policyVersion,
    promptVersion: envelope.promptVersion,
    feature: "WRITING",
    skill: "WRITING",
    quotaRemaining: envelope.quotaRemaining,
    feedback,
    replayed: data.replayed,
  };
}

function safeMeta(value: unknown): boolean {
  if (value === undefined) return true;
  const meta = record(value);
  return Boolean(
    meta &&
    hasOnlyKeys(meta, ["correlationId", "idempotencyStatus"]) &&
    (meta.correlationId === undefined || text(meta.correlationId)) &&
    (meta.idempotencyStatus === undefined || text(meta.idempotencyStatus)),
  );
}

function safeFeedbackMeta(value: unknown): boolean {
  const meta = record(value);
  return Boolean(
    meta &&
    hasOnlyKeys(meta, ["correlationId", "idempotencyStatus"]) &&
    text(meta.correlationId) &&
    meta.correlationId.length <= 128 &&
    ["created", "replayed"].includes(String(meta.idempotencyStatus)),
  );
}

function safeMedia(value: unknown): boolean {
  if (value === undefined) return true;
  return Boolean(
    Array.isArray(value) &&
    value.every((candidate) => {
      const media = record(candidate);
      return Boolean(
        media &&
        hasOnlyKeys(media, ["kind", "assetId", "altText"]) &&
        (media.kind === "IMAGE" || media.kind === "AUDIO") &&
        text(media.assetId) &&
        (media.altText === undefined ||
          media.altText === null ||
          text(media.altText)),
      );
    }),
  );
}

function parseTask(value: unknown): WritingTask | null {
  const task = record(value);
  if (
    !task ||
    !hasOnlyKeys(task, [
      "id",
      "skill",
      "taskType",
      "version",
      "promptKind",
      "responseMode",
      "instruction",
      "prompt",
      "durationSeconds",
      "minWords",
      "maxWords",
      "media",
    ]) ||
    !text(task.id) ||
    task.skill !== "WRITING" ||
    !text(task.taskType) ||
    !text(task.version) ||
    task.promptKind !== "TEXT" ||
    task.responseMode !== "TEXT" ||
    !text(task.instruction) ||
    !text(task.prompt)
  ) {
    return null;
  }

  const minWords = task.minWords;
  const maxWords = task.maxWords;
  if (
    (minWords !== undefined && !nonNegativeInteger(minWords)) ||
    (maxWords !== undefined && !nonNegativeInteger(maxWords)) ||
    (minWords !== undefined && maxWords !== undefined && minWords > maxWords) ||
    (task.durationSeconds !== undefined &&
      !nonNegativeInteger(task.durationSeconds)) ||
    !safeMedia(task.media)
  ) {
    return null;
  }

  return {
    id: task.id,
    skill: "WRITING",
    taskType: task.taskType,
    version: task.version,
    promptKind: "TEXT",
    responseMode: "TEXT",
    instruction: task.instruction,
    prompt: task.prompt,
    ...(minWords !== undefined ? { minWords } : {}),
    ...(maxWords !== undefined ? { maxWords } : {}),
  };
}

function parseSubmission(value: unknown): WritingSubmission | null {
  const submission = record(value);
  if (
    !submission ||
    !hasOnlyKeys(submission, [
      "submissionId",
      "responseMode",
      "wordCount",
      "characterCount",
      "submittedAt",
    ]) ||
    !text(submission.submissionId) ||
    submission.responseMode !== "TEXT" ||
    !nonNegativeInteger(submission.wordCount) ||
    !nonNegativeInteger(submission.characterCount) ||
    !date(submission.submittedAt)
  ) {
    return null;
  }
  return {
    submissionId: submission.submissionId,
    responseMode: "TEXT",
    wordCount: submission.wordCount,
    characterCount: submission.characterCount,
    submittedAt: submission.submittedAt,
  };
}

function parseSession(value: unknown): WritingSession | null {
  const session = record(value);
  if (
    !session ||
    !hasOnlyKeys(session, [
      "sessionId",
      "status",
      "task",
      "startedAt",
      "finalizedAt",
      "submission",
    ]) ||
    !text(session.sessionId) ||
    !["ACTIVE", "FINALIZED", "CANCELLED"].includes(String(session.status)) ||
    !date(session.startedAt) ||
    (session.finalizedAt !== null && !date(session.finalizedAt))
  ) {
    return null;
  }
  const task = parseTask(session.task);
  const submission =
    session.submission === null ? null : parseSubmission(session.submission);
  if (!task || (session.submission !== null && !submission)) return null;
  return {
    sessionId: session.sessionId,
    status: session.status as WritingSession["status"],
    task,
    startedAt: session.startedAt,
    finalizedAt: session.finalizedAt,
    submission,
  };
}

export function parseWritingResult(value: unknown): WritingSessionResult {
  const root = record(value);
  const data = record(root?.data);
  if (
    !root ||
    !hasOnlyKeys(root, ["data", "meta"]) ||
    !safeMeta(root.meta) ||
    !data ||
    !hasOnlyKeys(data, ["session", "replayed"]) ||
    typeof data.replayed !== "boolean"
  ) {
    throw new Error("INVALID_RESPONSE");
  }
  const session = parseSession(data.session);
  if (!session) throw new Error("INVALID_RESPONSE");
  return { session, replayed: data.replayed };
}

export function parseWritingSession(value: unknown): WritingSession {
  const root = record(value);
  const data = record(root?.data);
  if (
    !root ||
    !hasOnlyKeys(root, ["data", "meta"]) ||
    !safeMeta(root.meta) ||
    !data
  ) {
    throw new Error("INVALID_RESPONSE");
  }
  const session = parseSession(data.session);
  if (!session || !hasOnlyKeys(data, ["session"])) {
    throw new Error("INVALID_RESPONSE");
  }
  return session;
}
