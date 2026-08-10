import {
  parseWritingResult,
  parseWritingSession,
  type WritingSession,
  type WritingSessionResult,
} from "@/entities/toeic-writing/model/contracts";
import { requestLearnerApi } from "@/shared/api/learner-api-client";

export const WRITING_TASK_ID = "ep-writing-sentence-001";

export async function startWriting(
  taskId: string,
  idempotencyKey: string,
): Promise<WritingSessionResult> {
  return parseWritingResult(
    await requestLearnerApi<unknown>(
      `/toeic/writing/tasks/${encodeURIComponent(taskId)}/sessions`,
      { method: "POST", idempotencyKey },
    ),
  );
}

export async function getWriting(sessionId: string): Promise<WritingSession> {
  return parseWritingSession(
    await requestLearnerApi<unknown>(
      `/toeic/writing/sessions/${encodeURIComponent(sessionId)}`,
    ),
  );
}

export async function submitWriting(
  sessionId: string,
  text: string,
  idempotencyKey: string,
): Promise<WritingSessionResult> {
  return parseWritingResult(
    await requestLearnerApi<unknown>(
      `/toeic/writing/sessions/${encodeURIComponent(sessionId)}/submissions`,
      { method: "POST", body: { text }, idempotencyKey },
    ),
  );
}
