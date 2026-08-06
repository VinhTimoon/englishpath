import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { toeicEligibleWhere } from './toeic-eligibility.policy';
import { selectNewestByCanonical } from './toeic-timed-test.selection';
import type {
  ToeicTimedTestRepository,
  TimedAnswerCreateResult,
  TimedFinalizeResult,
  TimedPrivateQuestion,
  TimedQuestion,
  TimedSession,
  TimedSessionCreate,
} from './toeic-timed-test.models';

type DbAnswer = {
  questionId: string;
  selectedOption: string;
  isCorrect: boolean;
  answeredAt: Date;
};

type DbSession = {
  id: string;
  userId: string;
  clientSessionId: string;
  mode: 'MINI' | 'HALF';
  policyVersion: string;
  questionIds: string[];
  startedAt: Date;
  deadlineAt: Date;
  status: 'ACTIVE' | 'SUBMITTED' | 'EXPIRED';
  total: number;
  score: number | null;
  finalizedAt: Date | null;
  answers: DbAnswer[];
};

type DbQuestion = {
  id: string;
  questionId: string;
  prompt: string;
  options: unknown;
  part: TimedQuestion['part'];
  questionType: TimedQuestion['questionType'];
  difficulty: TimedQuestion['difficulty'];
  topic: string | null;
  stimulusGroup: string | null;
  mediaReference: string | null;
  explanation: string | null;
  correctAnswer?: string;
};

type TimedTransaction = {
  toeicTimedTestSession: {
    findFirst(args: Record<string, unknown>): Promise<unknown>;
    updateMany(args: Record<string, unknown>): Promise<{ count: number }>;
  };
  toeicTimedTestAnswer: {
    findUnique(args: Record<string, unknown>): Promise<unknown>;
    create(args: Record<string, unknown>): Promise<unknown>;
  };
};

type TimedDb = {
  $transaction<T>(
    callback: (transaction: TimedTransaction) => Promise<T>,
  ): Promise<T>;
  toeicQuestionVersion: {
    findMany(args: Record<string, unknown>): Promise<unknown>;
  };
  toeicTimedTestSession: {
    findFirst(args: Record<string, unknown>): Promise<unknown>;
    findUnique(args: Record<string, unknown>): Promise<unknown>;
    create(args: Record<string, unknown>): Promise<unknown>;
  };
};

const SESSION_SELECT = {
  id: true,
  userId: true,
  clientSessionId: true,
  mode: true,
  policyVersion: true,
  questionIds: true,
  startedAt: true,
  deadlineAt: true,
  status: true,
  total: true,
  score: true,
  finalizedAt: true,
  answers: {
    select: {
      questionId: true,
      selectedOption: true,
      isCorrect: true,
      answeredAt: true,
    },
  },
} as const;

const QUESTION_FIELDS = {
  id: true,
  questionId: true,
  prompt: true,
  options: true,
  part: true,
  questionType: true,
  difficulty: true,
  topic: true,
  stimulusGroup: true,
  mediaReference: true,
  explanation: true,
} as const;

const PRIVATE_QUESTION_SELECT = {
  ...QUESTION_FIELDS,
  correctAnswer: true,
} as const;

function asSession(value: unknown): TimedSession {
  const row = value as DbSession;
  return {
    id: row.id,
    userId: row.userId,
    clientSessionId: row.clientSessionId,
    mode: row.mode,
    policyVersion: row.policyVersion,
    questionIds: [...row.questionIds],
    startedAt: row.startedAt,
    deadlineAt: row.deadlineAt,
    status: row.status,
    total: row.total,
    score: row.score,
    finalizedAt: row.finalizedAt,
    answers: row.answers.map((answer) => ({ ...answer })),
  };
}

function asQuestion(value: unknown): TimedQuestion {
  const row = value as DbQuestion;
  return {
    id: row.id,
    questionId: row.questionId,
    prompt: row.prompt,
    options: row.options,
    part: row.part,
    questionType: row.questionType,
    difficulty: row.difficulty,
    topic: row.topic,
    stimulusGroup: row.stimulusGroup,
    mediaReference: row.mediaReference,
    explanation: row.explanation,
  };
}

function asPrivateQuestion(value: unknown): TimedPrivateQuestion {
  const row = value as DbQuestion & { correctAnswer: string };
  return { ...asQuestion(row), correctAnswer: row.correctAnswer };
}

function isUniqueConstraint(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

function eligibleWhere(now: Date) {
  return toeicEligibleWhere(now, {
    practiceEligible: true,
    usageScope: 'MOCK_TEST',
    accessTier: 'FREE',
  });
}

@Injectable()
export class PrismaToeicTimedTestRepository implements ToeicTimedTestRepository {
  private readonly db: TimedDb;

  constructor(prisma: PrismaService) {
    this.db = prisma as unknown as TimedDb;
  }

  async eligibleQuestions(now: Date) {
    const rows = await this.db.toeicQuestionVersion.findMany({
      where: eligibleWhere(now),
      orderBy: [{ questionId: 'asc' }, { version: 'desc' }, { id: 'asc' }],
      select: PRIVATE_QUESTION_SELECT,
    });
    return selectNewestByCanonical(
      (rows as readonly unknown[]).map(asPrivateQuestion),
    );
  }

  async safeQuestionsByIds(ids: readonly string[], now: Date) {
    void now;
    if (ids.length === 0) return [];
    const rows = await this.db.toeicQuestionVersion.findMany({
      // A timed session stores immutable version IDs.  Governance decides
      // whether a version may enter a session; it must not invalidate an
      // already-started learner snapshot during a later catalogue refresh.
      where: { id: { in: [...ids] } },
      orderBy: { id: 'asc' },
      select: QUESTION_FIELDS,
    });
    const byId = new Map(
      (rows as readonly unknown[]).map((row) => {
        const question = asQuestion(row);
        return [question.id, question] as const;
      }),
    );
    return ids.flatMap((id) => {
      const question = byId.get(id);
      return question ? [question] : [];
    });
  }

  async privateQuestionsByIds(ids: readonly string[], now: Date) {
    if (ids.length === 0) return [];
    const rows = await this.db.toeicQuestionVersion.findMany({
      // Active display uses the immutable session snapshot. Answer writes
      // re-check live governance before private grading is exposed here.
      where: { ...eligibleWhere(now), id: { in: [...ids] } },
      select: PRIVATE_QUESTION_SELECT,
    });
    return (rows as readonly unknown[]).map(asPrivateQuestion);
  }

  async findByClient(userId: string, clientSessionId: string) {
    const row = await this.db.toeicTimedTestSession.findUnique({
      where: { userId_clientSessionId: { userId, clientSessionId } },
      select: SESSION_SELECT,
    });
    return row ? asSession(row) : null;
  }

  async find(id: string, userId: string) {
    const row = await this.db.toeicTimedTestSession.findFirst({
      where: { id, userId },
      select: SESSION_SELECT,
    });
    return row ? asSession(row) : null;
  }

  async create(input: TimedSessionCreate) {
    const row = await this.db.toeicTimedTestSession.create({
      data: {
        ...input,
        questionIds: [...input.questionIds],
      },
      select: SESSION_SELECT,
    });
    return asSession(row);
  }

  async createAnswer(input: {
    sessionId: string;
    questionId: string;
    selectedOption: string;
    isCorrect: boolean;
    answeredAt: Date;
  }): Promise<TimedAnswerCreateResult> {
    try {
      return await this.db.$transaction(async (transaction) => {
        const locked = await transaction.toeicTimedTestSession.updateMany({
          where: {
            id: input.sessionId,
            status: 'ACTIVE',
            deadlineAt: { gt: input.answeredAt },
          },
          data: { finalizedAt: null },
        });
        if (locked.count !== 1) return 'closed';
        const prior = await transaction.toeicTimedTestAnswer.findUnique({
          where: {
            sessionId_questionId: {
              sessionId: input.sessionId,
              questionId: input.questionId,
            },
          },
          select: { selectedOption: true },
        });
        if (prior) {
          const value = prior as { selectedOption: string };
          return value.selectedOption === input.selectedOption
            ? 'replayed'
            : 'conflict';
        }
        try {
          await transaction.toeicTimedTestAnswer.create({ data: input });
        } catch (error) {
          if (!isUniqueConstraint(error)) throw error;
          const raced = await transaction.toeicTimedTestAnswer.findUnique({
            where: {
              sessionId_questionId: {
                sessionId: input.sessionId,
                questionId: input.questionId,
              },
            },
            select: { selectedOption: true },
          });
          if (!raced) throw error;
          const value = raced as { selectedOption: string };
          return value.selectedOption === input.selectedOption
            ? 'replayed'
            : 'conflict';
        }
        return 'created';
      });
    } catch (error) {
      if (isUniqueConstraint(error)) return 'conflict';
      throw error;
    }
  }

  async finalize(
    id: string,
    userId: string,
    at: Date,
  ): Promise<TimedFinalizeResult> {
    return this.db.$transaction(async (transaction) => {
      // Acquire the same active-session row lock used by answer insertion
      // before reading answers. This makes the answer snapshot authoritative:
      // either the answer commits before this lock, or it observes the
      // finalized status and is rejected.
      const locked = await transaction.toeicTimedTestSession.updateMany({
        where: { id, userId, status: 'ACTIVE' },
        data: { finalizedAt: null },
      });
      const row = await transaction.toeicTimedTestSession.findFirst({
        where: { id, userId },
        select: SESSION_SELECT,
      });
      if (!row) return { state: 'missing' as const };
      const session = asSession(row);
      if (locked.count !== 1 || session.status !== 'ACTIVE') {
        return { state: 'already-finalized' as const, session };
      }
      if (at < session.deadlineAt && session.answers.length < session.total) {
        return { state: 'incomplete' as const, session };
      }
      const status = at >= session.deadlineAt ? 'EXPIRED' : 'SUBMITTED';
      const score = session.answers.filter((answer) => answer.isCorrect).length;
      const updated = await transaction.toeicTimedTestSession.updateMany({
        where: { id, userId, status: 'ACTIVE' },
        data: { status, score, finalizedAt: at },
      });
      if (updated.count !== 1) {
        const current = await transaction.toeicTimedTestSession.findFirst({
          where: { id, userId },
          select: SESSION_SELECT,
        });
        return current
          ? { state: 'already-finalized' as const, session: asSession(current) }
          : { state: 'missing' as const };
      }
      const current = await transaction.toeicTimedTestSession.findFirst({
        where: { id, userId },
        select: SESSION_SELECT,
      });
      return current
        ? { state: 'finalized' as const, session: asSession(current) }
        : { state: 'missing' as const };
    });
  }
}
