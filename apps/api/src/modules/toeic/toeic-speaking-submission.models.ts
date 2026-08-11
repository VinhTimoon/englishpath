import type { LearnerTask, TaskVersion } from './toeic-speaking-writing.models';

export const TOEIC_SPEAKING_SUBMISSION_REPOSITORY = Symbol(
  'TOEIC_SPEAKING_SUBMISSION_REPOSITORY',
);
export const TOEIC_SPEAKING_TASK_CATALOGUE = Symbol(
  'TOEIC_SPEAKING_TASK_CATALOGUE',
);

export type SpeakingSessionStatus = 'ACTIVE' | 'FINALIZED' | 'CANCELLED';

export type SpeakingSubmissionRecord = Readonly<{
  id: string;
  sessionId: string;
  userId: string;
  idempotencyKey: string;
  responseMode: 'RECORDED_AUDIO';
  contentType: string;
  durationSeconds: number;
  sizeBytes: number;
  submissionReference: string;
  submittedAt: Date;
}>;

export type SpeakingSessionRecord = Readonly<{
  id: string;
  userId: string;
  taskId: string;
  taskVersion: string;
  status: SpeakingSessionStatus;
  startedAt: Date;
  finalizedAt: Date | null;
  submission: SpeakingSubmissionRecord | null;
}>;

export type SpeakingSessionCreate = Readonly<{
  userId: string;
  taskId: string;
  taskVersion: string;
  idempotencyKey: string;
}>;

export type SpeakingSubmissionCreate = Readonly<{
  sessionId: string;
  userId: string;
  idempotencyKey: string;
  responseMode: 'RECORDED_AUDIO';
  contentType: string;
  durationSeconds: number;
  sizeBytes: number;
  submissionReference: string;
}>;

export type SpeakingSubmissionResult = Readonly<{
  session: SpeakingSessionRecord;
  created: boolean;
}>;

export interface ToeicSpeakingSubmissionRepository {
  findSession(
    userId: string,
    sessionId: string,
  ): Promise<SpeakingSessionRecord | null>;
  findByStartIdempotency(
    userId: string,
    idempotencyKey: string,
  ): Promise<SpeakingSessionRecord | null>;
  findSubmissionByIdempotency(
    userId: string,
    idempotencyKey: string,
  ): Promise<SpeakingSubmissionRecord | null>;
  createSession(input: SpeakingSessionCreate): Promise<SpeakingSessionRecord>;
  finalizeWithSubmission(
    input: SpeakingSubmissionCreate,
    finalizedAt: Date,
  ): Promise<SpeakingSubmissionResult | null>;
}

export interface ToeicSpeakingTaskCatalogue {
  findPublished(taskId: string): Promise<TaskVersion | null>;
}

export type SafeSpeakingSession = Readonly<{
  sessionId: string;
  status: SpeakingSessionStatus;
  task: LearnerTask;
  startedAt: Date;
  finalizedAt: Date | null;
  submission: Readonly<{
    submissionId: string;
    recordingId?: string;
    responseMode: 'RECORDED_AUDIO';
    durationSeconds: number;
    sizeBytes: number;
    submittedAt: Date;
  }> | null;
}>;
