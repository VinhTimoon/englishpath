export const SPEAKING_CONTENT_TYPES = [
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
] as const;
export type SpeakingContentType = (typeof SPEAKING_CONTENT_TYPES)[number];

export type SpeakingTask = {
  id: string;
  skill: "SPEAKING";
  taskType: string;
  version: string;
  promptKind: "TEXT" | "IMAGE" | "TEXT_AND_IMAGE";
  responseMode: "RECORDED_AUDIO";
  instruction: string;
  prompt: string;
  durationSeconds: number;
  media?: readonly {
    kind: "IMAGE" | "AUDIO";
    assetId: string;
    altText?: string | null;
  }[];
};

export type SpeakingSubmission = {
  submissionId: string;
  recordingId?: string;
  responseMode: "RECORDED_AUDIO";
  durationSeconds: number;
  sizeBytes: number;
  submittedAt: string;
};

export type SpeakingSession = {
  sessionId: string;
  status: "ACTIVE" | "FINALIZED" | "CANCELLED";
  task: SpeakingTask;
  startedAt: string;
  finalizedAt: string | null;
  submission: SpeakingSubmission | null;
};

export type SpeakingSessionResult = {
  session: SpeakingSession;
  replayed: boolean;
};

export type SpeakingPlayback = {
  recordingId: string;
  capability: string;
  expiresAt: string;
};

export type SpeakingPlaybackAuthorization = {
  authorized: true;
  expiresAt: string;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function date(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function integer(value: unknown, minimum = 0): value is number {
  return (
    typeof value === "number" && Number.isInteger(value) && value >= minimum
  );
}

function only(value: Record<string, unknown>, keys: readonly string[]) {
  return Object.keys(value).every((key) => keys.includes(key));
}

function parseTask(value: unknown): SpeakingTask | null {
  const task = record(value);
  if (
    !task ||
    !only(task, [
      "id",
      "skill",
      "taskType",
      "version",
      "promptKind",
      "responseMode",
      "instruction",
      "prompt",
      "durationSeconds",
      "media",
    ]) ||
    !text(task.id) ||
    task.skill !== "SPEAKING" ||
    !text(task.taskType) ||
    !text(task.version) ||
    !["TEXT", "IMAGE", "TEXT_AND_IMAGE"].includes(String(task.promptKind)) ||
    task.responseMode !== "RECORDED_AUDIO" ||
    !text(task.instruction) ||
    !text(task.prompt) ||
    !integer(task.durationSeconds, 1)
  ) {
    return null;
  }
  if (
    task.media !== undefined &&
    (!Array.isArray(task.media) ||
      task.media.some((candidate) => {
        const media = record(candidate);
        return (
          !media ||
          !only(media, ["kind", "assetId", "altText"]) ||
          !["IMAGE", "AUDIO"].includes(String(media.kind)) ||
          !text(media.assetId) ||
          (media.altText !== undefined &&
            media.altText !== null &&
            !text(media.altText))
        );
      }))
  ) {
    return null;
  }
  return {
    id: task.id,
    skill: "SPEAKING",
    taskType: task.taskType,
    version: task.version,
    promptKind: task.promptKind as SpeakingTask["promptKind"],
    responseMode: "RECORDED_AUDIO",
    instruction: task.instruction,
    prompt: task.prompt,
    durationSeconds: task.durationSeconds,
    ...(task.media
      ? {
          media: task.media.map((candidate) => {
            const media = candidate as Record<string, unknown>;
            return {
              kind: media.kind as "IMAGE" | "AUDIO",
              assetId: media.assetId as string,
              ...(media.altText !== undefined
                ? { altText: media.altText as string | null }
                : {}),
            };
          }),
        }
      : {}),
  };
}

function parseSubmission(value: unknown): SpeakingSubmission | null {
  const submission = record(value);
  if (
    !submission ||
    !only(submission, [
      "submissionId",
      "recordingId",
      "responseMode",
      "durationSeconds",
      "sizeBytes",
      "submittedAt",
    ]) ||
    !text(submission.submissionId) ||
    submission.responseMode !== "RECORDED_AUDIO" ||
    !integer(submission.durationSeconds, 1) ||
    !integer(submission.sizeBytes, 1) ||
    !date(submission.submittedAt)
  ) {
    return null;
  }
  return {
    submissionId: submission.submissionId,
    ...(typeof submission.recordingId === "string"
      ? { recordingId: submission.recordingId }
      : {}),
    responseMode: "RECORDED_AUDIO",
    durationSeconds: submission.durationSeconds,
    sizeBytes: submission.sizeBytes,
    submittedAt: submission.submittedAt,
  };
}

function parseSession(value: unknown): SpeakingSession | null {
  const session = record(value);
  if (
    !session ||
    !only(session, [
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
    status: session.status as SpeakingSession["status"],
    task,
    startedAt: session.startedAt,
    finalizedAt: session.finalizedAt,
    submission,
  };
}

function parseEnvelope(value: unknown, expectedKeys: readonly string[]) {
  const root = record(value);
  const data = record(root?.data);
  if (
    !root ||
    !only(root, ["data", "meta"]) ||
    !data ||
    !only(data, expectedKeys)
  ) {
    throw new Error("INVALID_RESPONSE");
  }
  return data;
}

export function parseSpeakingResult(value: unknown): SpeakingSessionResult {
  const data = parseEnvelope(value, ["session", "replayed"]);
  if (typeof data.replayed !== "boolean") throw new Error("INVALID_RESPONSE");
  const session = parseSession(data.session);
  if (!session) throw new Error("INVALID_RESPONSE");
  return { session, replayed: data.replayed };
}

export function parseSpeakingSession(value: unknown): SpeakingSession {
  const data = parseEnvelope(value, ["session"]);
  const session = parseSession(data.session);
  if (!session) throw new Error("INVALID_RESPONSE");
  return session;
}

export function parseSpeakingPlayback(value: unknown): SpeakingPlayback {
  const data = parseEnvelope(value, ["playback"]);
  const playback = record(data.playback);
  if (
    !playback ||
    !only(playback, ["recordingId", "capability", "expiresAt"]) ||
    !text(playback.recordingId) ||
    !text(playback.capability) ||
    !date(playback.expiresAt)
  ) {
    throw new Error("INVALID_RESPONSE");
  }
  return {
    recordingId: playback.recordingId,
    capability: playback.capability,
    expiresAt: playback.expiresAt,
  };
}

export function parseSpeakingPlaybackAuthorization(
  value: unknown,
): SpeakingPlaybackAuthorization {
  const data = parseEnvelope(value, ["recording", "playback"]);
  const playback = record(data.playback);
  if (
    !playback ||
    !only(playback, ["authorized", "expiresAt"]) ||
    playback.authorized !== true ||
    !date(playback.expiresAt)
  ) {
    throw new Error("INVALID_RESPONSE");
  }
  return { authorized: true, expiresAt: playback.expiresAt };
}
