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
