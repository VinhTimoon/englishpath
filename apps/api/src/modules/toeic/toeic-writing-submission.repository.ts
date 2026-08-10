import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  ToeicWritingSession,
  ToeicWritingSubmission,
} from '../../generated/prisma/client';
import type {
  ToeicWritingSubmissionRepository,
  WritingSessionCreate,
  WritingSessionRecord,
  WritingSubmissionCreate,
  WritingSubmissionRecord,
  WritingSubmissionResult,
} from './toeic-writing-submission.models';

type WritingDb = {
  toeicWritingSession: {
    findFirst(args: Record<string, unknown>): Promise<unknown>;
    findUnique(args: Record<string, unknown>): Promise<unknown>;
    create(args: Record<string, unknown>): Promise<unknown>;
  };
  toeicWritingSubmission: {
    findUnique(args: Record<string, unknown>): Promise<unknown>;
  };
  $transaction<T>(
    callback: (transaction: WritingTransaction) => Promise<T>,
  ): Promise<T>;
};

type WritingTransaction = {
  toeicWritingSession: {
    updateMany(args: Record<string, unknown>): Promise<{ count: number }>;
    findFirst(args: Record<string, unknown>): Promise<unknown>;
  };
  toeicWritingSubmission: {
    create(args: Record<string, unknown>): Promise<unknown>;
  };
};

const SUBMISSION_SELECT = {
  id: true,
  sessionId: true,
  userId: true,
  idempotencyKey: true,
  responseMode: true,
  wordCount: true,
  characterCount: true,
  submittedText: true,
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

function asSubmission(value: unknown): WritingSubmissionRecord {
  const row = value as ToeicWritingSubmission;
  return {
    id: row.id,
    sessionId: row.sessionId,
    userId: row.userId,
    idempotencyKey: row.idempotencyKey,
    responseMode: row.responseMode as 'TEXT',
    wordCount: row.wordCount,
    characterCount: row.characterCount,
    submittedText: row.submittedText,
    submittedAt: row.submittedAt,
  };
}

function asSession(value: unknown): WritingSessionRecord {
  const row = value as ToeicWritingSession & {
    submission?: ToeicWritingSubmission | null;
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
export class PrismaToeicWritingSubmissionRepository implements ToeicWritingSubmissionRepository {
  private readonly db: WritingDb;

  constructor(prisma: PrismaService) {
    this.db = prisma as unknown as WritingDb;
  }

  async findSession(userId: string, sessionId: string) {
    const row = await this.db.toeicWritingSession.findFirst({
      where: { id: sessionId, userId },
      select: SESSION_SELECT,
    });
    return row ? asSession(row) : null;
  }

  async findByStartIdempotency(userId: string, idempotencyKey: string) {
    const row = await this.db.toeicWritingSession.findUnique({
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
    const row = await this.db.toeicWritingSubmission.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
      select: SUBMISSION_SELECT,
    });
    return row ? asSubmission(row) : null;
  }

  async createSession(input: WritingSessionCreate) {
    const row = await this.db.toeicWritingSession.create({
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
    input: WritingSubmissionCreate,
    finalizedAt: Date,
  ): Promise<WritingSubmissionResult | null> {
    return this.db.$transaction(async (transaction) => {
      const updated = await transaction.toeicWritingSession.updateMany({
        where: { id: input.sessionId, userId: input.userId, status: 'ACTIVE' },
        data: { status: 'FINALIZED', finalizedAt },
      });
      if (updated.count !== 1) return null;
      await transaction.toeicWritingSubmission.create({
        data: {
          sessionId: input.sessionId,
          userId: input.userId,
          idempotencyKey: input.idempotencyKey,
          responseMode: input.responseMode,
          wordCount: input.wordCount,
          characterCount: input.characterCount,
          submittedText: input.submittedText,
        },
      });
      const row = await transaction.toeicWritingSession.findFirst({
        where: { id: input.sessionId, userId: input.userId },
        select: SESSION_SELECT,
      });
      return row ? { session: asSession(row), created: true } : null;
    });
  }
}
