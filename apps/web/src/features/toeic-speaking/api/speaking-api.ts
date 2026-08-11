import {
  parseSpeakingResult,
  parseSpeakingPlayback,
  parseSpeakingSession,
  type SpeakingSession,
  type SpeakingSessionResult,
  type SpeakingContentType,
  type SpeakingPlayback,
  parseSpeakingPlaybackAuthorization,
  type SpeakingPlaybackAuthorization,
} from "@/entities/toeic-speaking/model/contracts";
import {
  requestLearnerApi,
  requestLearnerApiBlob,
} from "@/shared/api/learner-api-client";

export const SPEAKING_TASK_ID = "ep-speaking-read-aloud-001";

export type SpeakingFeedback = {
  outcome: "ALLOWED" | "PROVIDER_UNAVAILABLE" | "DENIED";
  feedback: {
    advisoryOnly: true;
    summary: string;
    strengths: string[];
    nextSteps: string[];
  } | null;
};

const SAFE_FEEDBACK_KEYS = new Set([
  "advisoryOnly",
  "summary",
  "strengths",
  "nextSteps",
]);
const SAFE_DATA_KEYS = new Set(["feedback", "replayed"]);
const SAFE_ENVELOPE_KEYS = new Set([
  "outcome",
  "policyVersion",
  "promptVersion",
  "feature",
  "skill",
  "quotaRemaining",
  "feedback",
]);
const SAFE_META_KEYS = new Set(["correlationId", "idempotencyStatus"]);
const UNSAFE_FEEDBACK_TEXT =
  /provider|credential|secret|api[-_ ]?key|token|rubric|official score|raw response|correct\s+(?:answer|option|choice)|(?:selected|chosen|your)\s+(?:answer|option|choice)|(?:raw|full|verbatim)\s+submission/i;

function parseSpeakingFeedback(value: unknown): SpeakingFeedback {
  const root =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  const data =
    root?.data && typeof root.data === "object" && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : null;
  if (
    !root ||
    !data ||
    Object.keys(root).some((key) => !["data", "meta"].includes(key)) ||
    !root.meta ||
    typeof root.meta !== "object" ||
    Array.isArray(root.meta) ||
    Object.keys(root.meta as Record<string, unknown>).some(
      (key) => !SAFE_META_KEYS.has(key),
    ) ||
    typeof (root.meta as Record<string, unknown>).correlationId !== "string" ||
    !["created", "replayed"].includes(
      String((root.meta as Record<string, unknown>).idempotencyStatus),
    ) ||
    Object.keys(data).some((key) => !SAFE_DATA_KEYS.has(key)) ||
    typeof data.replayed !== "boolean" ||
    !data.feedback ||
    typeof data.feedback !== "object" ||
    Array.isArray(data.feedback)
  ) {
    throw new Error("INVALID_RESPONSE");
  }
  const envelope = data.feedback as Record<string, unknown>;
  if (
    Object.keys(envelope).some((key) => !SAFE_ENVELOPE_KEYS.has(key)) ||
    !["ALLOWED", "PROVIDER_UNAVAILABLE", "DENIED"].includes(
      String(envelope.outcome),
    )
  ) {
    throw new Error("INVALID_RESPONSE");
  }
  if (envelope.feedback === null) {
    if (envelope.outcome === "ALLOWED") throw new Error("INVALID_RESPONSE");
    return {
      outcome: envelope.outcome as SpeakingFeedback["outcome"],
      feedback: null,
    };
  }
  if (envelope.outcome !== "ALLOWED") throw new Error("INVALID_RESPONSE");
  const safe =
    envelope.feedback &&
    typeof envelope.feedback === "object" &&
    !Array.isArray(envelope.feedback)
      ? (envelope.feedback as Record<string, unknown>)
      : null;
  if (
    !safe ||
    Object.keys(safe).some((key) => !SAFE_FEEDBACK_KEYS.has(key)) ||
    safe.advisoryOnly !== true ||
    typeof safe.summary !== "string" ||
    safe.summary.length === 0 ||
    safe.summary.length > 500 ||
    UNSAFE_FEEDBACK_TEXT.test(safe.summary) ||
    !Array.isArray(safe.strengths) ||
    safe.strengths.length > 3 ||
    !safe.strengths.every(
      (item) =>
        typeof item === "string" &&
        item.length <= 200 &&
        !UNSAFE_FEEDBACK_TEXT.test(item),
    ) ||
    !Array.isArray(safe.nextSteps) ||
    safe.nextSteps.length > 3 ||
    !safe.nextSteps.every(
      (item) =>
        typeof item === "string" &&
        item.length <= 200 &&
        !UNSAFE_FEEDBACK_TEXT.test(item),
    )
  ) {
    throw new Error("INVALID_RESPONSE");
  }
  return {
    outcome: envelope.outcome as SpeakingFeedback["outcome"],
    feedback: {
      advisoryOnly: true,
      summary: safe.summary,
      strengths: safe.strengths as string[],
      nextSteps: safe.nextSteps as string[],
    },
  };
}

export async function requestSpeakingFeedback(
  sessionId: string,
  idempotencyKey: string,
): Promise<SpeakingFeedback> {
  return parseSpeakingFeedback(
    await requestLearnerApi<unknown>(
      `/toeic/speaking/sessions/${encodeURIComponent(sessionId)}/feedback`,
      { method: "POST", idempotencyKey },
    ),
  );
}

export async function startSpeaking(
  taskId: string,
  idempotencyKey: string,
): Promise<SpeakingSessionResult> {
  return parseSpeakingResult(
    await requestLearnerApi<unknown>(
      `/toeic/speaking/tasks/${encodeURIComponent(taskId)}/sessions`,
      { method: "POST", idempotencyKey },
    ),
  );
}

export async function getSpeaking(sessionId: string): Promise<SpeakingSession> {
  return parseSpeakingSession(
    await requestLearnerApi<unknown>(
      `/toeic/speaking/sessions/${encodeURIComponent(sessionId)}`,
    ),
  );
}

export async function submitSpeaking(
  sessionId: string,
  input: {
    contentType: SpeakingContentType;
    durationSeconds: number;
    sizeBytes: number;
    submissionReference: string;
  },
  idempotencyKey: string,
): Promise<SpeakingSessionResult> {
  return parseSpeakingResult(
    await requestLearnerApi<unknown>(
      `/toeic/speaking/sessions/${encodeURIComponent(sessionId)}/submissions`,
      {
        method: "POST",
        body: { responseMode: "RECORDED_AUDIO", ...input },
        idempotencyKey,
      },
    ),
  );
}

export async function issueSpeakingPlayback(
  recordingId: string,
): Promise<SpeakingPlayback> {
  return parseSpeakingPlayback(
    await requestLearnerApi<unknown>(
      `/toeic/speaking/recordings/${encodeURIComponent(recordingId)}/playback-capability`,
      { method: "POST" },
    ),
  );
}

export async function authorizeSpeakingPlayback(
  recordingId: string,
  capability: string,
): Promise<SpeakingPlaybackAuthorization> {
  return parseSpeakingPlaybackAuthorization(
    await requestLearnerApi<unknown>(
      `/toeic/speaking/recordings/${encodeURIComponent(recordingId)}/playback`,
      { headers: { "X-Playback-Capability": capability } },
    ),
  );
}

export async function uploadSpeakingRecording(recordingId: string, blob: Blob) {
  const form = new FormData();
  form.append("file", blob, "speaking-recording");
  return requestLearnerApi<unknown>(
    `/toeic/speaking/recordings/${encodeURIComponent(recordingId)}/content`,
    { method: "POST", body: form, headers: { Accept: "application/json" } },
  );
}

export async function readSpeakingPlayback(
  recordingId: string,
  capability: string,
) {
  return requestLearnerApiBlob(
    `/toeic/speaking/recordings/${encodeURIComponent(recordingId)}/playback/content`,
    { "X-Playback-Capability": capability },
  );
}
