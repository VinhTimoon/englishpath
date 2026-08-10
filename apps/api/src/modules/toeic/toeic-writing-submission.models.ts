import type { LearnerTask, TaskVersion } from './toeic-speaking-writing.models';

export const TOEIC_WRITING_SUBMISSION_REPOSITORY = Symbol(
  'TOEIC_WRITING_SUBMISSION_REPOSITORY',
);
export const TOEIC_WRITING_TASK_CATALOGUE = Symbol(
  'TOEIC_WRITING_TASK_CATALOGUE',
);

export type WritingSessionStatus = 'ACTIVE' | 'FINALIZED' | 'CANCELLED';

export type WritingSubmissionRecord = Readonly<{
  id: string;
  sessionId: string;
  userId: string;
  idempotencyKey: string;
  responseMode: 'TEXT';
  wordCount: number;
  characterCount: number;
  submittedText: string;
  submittedAt: Date;
}>;

export type WritingSessionRecord = Readonly<{
  id: string;
  userId: string;
  taskId: string;
  taskVersion: string;
  status: WritingSessionStatus;
  startedAt: Date;
  finalizedAt: Date | null;
  submission: WritingSubmissionRecord | null;
}>;

export type WritingSessionCreate = Readonly<{
  userId: string;
  taskId: string;
  taskVersion: string;
  idempotencyKey: string;
}>;

export type WritingSubmissionCreate = Readonly<{
  sessionId: string;
  userId: string;
  idempotencyKey: string;
  responseMode: 'TEXT';
  wordCount: number;
  characterCount: number;
  submittedText: string;
}>;

export type WritingSubmissionResult = Readonly<{
  session: WritingSessionRecord;
  created: boolean;
}>;

export interface ToeicWritingSubmissionRepository {
  findSession(
    userId: string,
    sessionId: string,
  ): Promise<WritingSessionRecord | null>;
  findByStartIdempotency(
    userId: string,
    idempotencyKey: string,
  ): Promise<WritingSessionRecord | null>;
  findSubmissionByIdempotency(
    userId: string,
    idempotencyKey: string,
  ): Promise<WritingSubmissionRecord | null>;
  createSession(input: WritingSessionCreate): Promise<WritingSessionRecord>;
  finalizeWithSubmission(
    input: WritingSubmissionCreate,
    finalizedAt: Date,
  ): Promise<WritingSubmissionResult | null>;
}

export interface ToeicWritingTaskCatalogue {
  findPublished(taskId: string): Promise<TaskVersion | null>;
}

export type SafeWritingSession = Readonly<{
  sessionId: string;
  status: WritingSessionStatus;
  task: LearnerTask;
  startedAt: Date;
  finalizedAt: Date | null;
  submission: Readonly<{
    submissionId: string;
    responseMode: 'TEXT';
    wordCount: number;
    characterCount: number;
    submittedAt: Date;
  }> | null;
}>;
