import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  ToeicSpeakingSession,
  ToeicSpeakingSubmission,
} from '../../generated/prisma/client';
import type {
  SpeakingSessionCreate,
  SpeakingSessionRecord,
  SpeakingSubmissionCreate,
  SpeakingSubmissionRecord,
  SpeakingSubmissionResult,
  ToeicSpeakingSubmissionRepository,
} from './toeic-speaking-submission.models';

type SpeakingDb = {
  toeicSpeakingSession: {
    findFirst(args: Record<string, unknown>): Promise<unknown>;
    findUnique(args: Record<string, unknown>): Promise<unknown>;
    create(args: Record<string, unknown>): Promise<unknown>;
  };
  toeicSpeakingSubmission: {
    findUnique(args: Record<string, unknown>): Promise<unknown>;
    create(args: Record<string, unknown>): Promise<unknown>;
  };
  $transaction<T>(
    callback: (transaction: SpeakingTransaction) => Promise<T>,
  ): Promise<T>;
};

type SpeakingTransaction = {
  toeicSpeakingSession: {
    updateMany(args: Record<string, unknown>): Promise<{ count: number }>;
    findFirst(args: Record<string, unknown>): Promise<unknown>;
  };
  toeicSpeakingSubmission: {
    create(args: Record<string, unknown>): Promise<unknown>;
  };
};

const SUBMISSION_SELECT = {
  id: true,
  sessionId: true,
  userId: true,
  idempotencyKey: true,
  responseMode: true,
  contentType: true,
  durationSeconds: true,
  sizeBytes: true,
  submissionReference: true,
  submittedAt: true,
} as const;
const SESSION_SELECT = {
  id: true,
  userId: true,
  taskId: true,
  taskVersion: true,
  status: true,
  startedAt: true,
  finalizedAt: true,
  submission: { select: SUBMISSION_SELECT },
} as const;

function asSubmission(value: unknown): SpeakingSubmissionRecord {
  const row = value as ToeicSpeakingSubmission;
  return {
    id: row.id,
    sessionId: row.sessionId,
    userId: row.userId,
    idempotencyKey: row.idempotencyKey,
    responseMode: row.responseMode as 'RECORDED_AUDIO',
    contentType: row.contentType,
    durationSeconds: row.durationSeconds,
    sizeBytes: row.sizeBytes,
    submissionReference: row.submissionReference,
    submittedAt: row.submittedAt,
  };
}

function asSession(value: unknown): SpeakingSessionRecord {
  const row = value as ToeicSpeakingSession & {
    submission?: ToeicSpeakingSubmission | null;
  };
  return {
    id: row.id,
    userId: row.userId,
    taskId: row.taskId,
    taskVersion: row.taskVersion,
    status: row.status,
    startedAt: row.startedAt,
    finalizedAt: row.finalizedAt,
    submission: row.submission ? asSubmission(row.submission) : null,
  };
}

@Injectable()
export class PrismaToeicSpeakingSubmissionRepository implements ToeicSpeakingSubmissionRepository {
  private readonly db: SpeakingDb;

  constructor(prisma: PrismaService) {
    this.db = prisma as unknown as SpeakingDb;
  }

  async findSession(userId: string, sessionId: string) {
    const row = await this.db.toeicSpeakingSession.findFirst({
      where: { id: sessionId, userId },
      select: SESSION_SELECT,
    });
    return row ? asSession(row) : null;
  }

  async findByStartIdempotency(userId: string, idempotencyKey: string) {
    const row = await this.db.toeicSpeakingSession.findUnique({
      where: {
        userId_startIdempotencyKey: {
          userId,
          startIdempotencyKey: idempotencyKey,
        },
      },
      select: SESSION_SELECT,
    });
    return row ? asSession(row) : null;
  }

  async findSubmissionByIdempotency(userId: string, idempotencyKey: string) {
    const row = await this.db.toeicSpeakingSubmission.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
      select: SUBMISSION_SELECT,
    });
    return row ? asSubmission(row) : null;
  }

  async createSession(input: SpeakingSessionCreate) {
    const row = await this.db.toeicSpeakingSession.create({
      data: {
        userId: input.userId,
        taskId: input.taskId,
        taskVersion: input.taskVersion,
        startIdempotencyKey: input.idempotencyKey,
      },
      select: SESSION_SELECT,
    });
    return asSession(row);
  }

  async finalizeWithSubmission(
    input: SpeakingSubmissionCreate,
    finalizedAt: Date,
  ): Promise<SpeakingSubmissionResult | null> {
    return this.db.$transaction(async (transaction) => {
      const updated = await transaction.toeicSpeakingSession.updateMany({
        where: { id: input.sessionId, userId: input.userId, status: 'ACTIVE' },
        data: { status: 'FINALIZED', finalizedAt },
      });
      if (updated.count !== 1) return null;
      await transaction.toeicSpeakingSubmission.create({
        data: {
          sessionId: input.sessionId,
          userId: input.userId,
          idempotencyKey: input.idempotencyKey,
          responseMode: input.responseMode,
          contentType: input.contentType,
          durationSeconds: input.durationSeconds,
          sizeBytes: input.sizeBytes,
          submissionReference: input.submissionReference,
        },
      });
      const row = await transaction.toeicSpeakingSession.findFirst({
        where: { id: input.sessionId, userId: input.userId },
        select: SESSION_SELECT,
      });
      return row ? { session: asSession(row), created: true } : null;
    });
  }
}
