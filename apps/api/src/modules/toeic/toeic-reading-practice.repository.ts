import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  ToeicDifficulty,
  ToeicPart,
  ToeicQuestionType,
} from '../../generated/prisma/enums';
import { toeicEligibleWhere } from './toeic-eligibility.policy';
import type {
  ReadingAnswerCreate,
  ReadingPrivateQuestion,
  ReadingQuestion,
  ReadingGradingSession,
  ReadingSession,
  ReadingSessionCreate,
  ToeicReadingPracticeRepository,
} from './toeic-reading-practice.models';

type DbAnswer = {
  id: string;
  sessionId: string;
  questionId: string;
  selectedOption: string;
  isCorrect: boolean;
  answeredAt: Date;
};

type DbSession = {
  id: string;
  userId: string;
  clientSessionId: string;
  readingPart: ToeicPart | null;
  questionIds: string[];
  status: 'ACTIVE' | 'SUBMITTED';
  total: number;
  score: number | null;
  startedAt: Date;
  submittedAt: Date | null;
  answers: DbAnswer[];
};

type DbQuestion = {
  id: string;
  questionId: string;
  prompt: string;
  options: unknown;
  part: ToeicPart;
  questionType: ToeicQuestionType;
  difficulty: ToeicDifficulty;
  topic: string | null;
  stimulusGroup: string | null;
  mediaReference: string | null;
  explanation: string | null;
};

type DbPrivateQuestion = {
  id: string;
  options: unknown;
  correctAnswer: string;
};

type ReadingTransaction = {
  toeicReadingPracticeSession: {
    updateMany(args: Record<string, unknown>): Promise<{ count: number }>;
  };
  toeicReadingPracticeAnswer: {
    create(args: Record<string, unknown>): Promise<unknown>;
  };
};

type ReadingDb = {
  $transaction<T>(
    callback: (transaction: ReadingTransaction) => Promise<T>,
  ): Promise<T>;
  toeicQuestionVersion: {
    findMany(args: Record<string, unknown>): Promise<unknown>;
  };
  toeicReadingPracticeSession: {
    findFirst(args: Record<string, unknown>): Promise<unknown>;
    findUnique(args: Record<string, unknown>): Promise<unknown>;
    create(args: Record<string, unknown>): Promise<unknown>;
    updateMany(args: Record<string, unknown>): Promise<{ count: number }>;
  };
  toeicReadingPracticeAnswer: {
    create(args: Record<string, unknown>): Promise<unknown>;
  };
};

const SESSION_SELECT = {
  id: true,
  userId: true,
  clientSessionId: true,
  readingPart: true,
  questionIds: true,
  status: true,
  total: true,
  score: true,
  startedAt: true,
  submittedAt: true,
  answers: {
    select: {
      id: true,
      sessionId: true,
      questionId: true,
      selectedOption: true,
      answeredAt: true,
    },
  },
} as const;

const GRADING_SESSION_SELECT = {
  ...SESSION_SELECT,
  answers: {
    select: {
      id: true,
      sessionId: true,
      questionId: true,
      selectedOption: true,
      isCorrect: true,
      answeredAt: true,
    },
  },
} as const;

const SAFE_QUESTION_SELECT = {
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
  id: true,
  options: true,
  correctAnswer: true,
} as const;

function practiceWhere(now: Date, readingPart?: ToeicPart) {
  return toeicEligibleWhere(now, {
    readingPart,
    practiceEligible: true,
    readingPractice: true,
  });
}

function asSession(value: unknown): ReadingSession {
  const record = value as DbSession;
  return {
    id: record.id,
    userId: record.userId,
    clientSessionId: record.clientSessionId,
    readingPart: record.readingPart,
    questionIds: [...record.questionIds],
    status: record.status,
    total: record.total,
    score: record.score,
    startedAt: record.startedAt,
    submittedAt: record.submittedAt,
    answers: record.answers.map(
      ({ id, sessionId, questionId, selectedOption, answeredAt }) => ({
        id,
        sessionId,
        questionId,
        selectedOption,
        answeredAt,
      }),
    ),
  };
}

function asGradingSession(value: unknown): ReadingGradingSession {
  const record = value as DbSession;
  return {
    id: record.id,
    userId: record.userId,
    clientSessionId: record.clientSessionId,
    readingPart: record.readingPart,
    questionIds: [...record.questionIds],
    status: record.status,
    total: record.total,
    score: record.score,
    startedAt: record.startedAt,
    submittedAt: record.submittedAt,
    answers: record.answers.map((answer) => ({ ...answer })),
  };
}

function asQuestion(value: unknown): ReadingQuestion {
  const question = value as DbQuestion;
  return {
    id: question.id,
    questionId: question.questionId,
    prompt: question.prompt,
    options: question.options,
    part: question.part,
    questionType: question.questionType,
    difficulty: question.difficulty,
    topic: question.topic,
    stimulusGroup: question.stimulusGroup,
    mediaReference: question.mediaReference,
    explanation: question.explanation,
  };
}

@Injectable()
export class PrismaToeicReadingPracticeRepository implements ToeicReadingPracticeRepository {
  private readonly db: ReadingDb;

  constructor(prisma: PrismaService) {
    this.db = prisma as unknown as ReadingDb;
  }

  async eligibleQuestions(now: Date, readingPart?: ToeicPart) {
    const rows = await this.db.toeicQuestionVersion.findMany({
      where: practiceWhere(now, readingPart),
      orderBy: [{ questionId: 'asc' }, { version: 'desc' }],
      select: SAFE_QUESTION_SELECT,
    });
    const current = new Map<string, ReadingQuestion>();
    for (const row of rows as readonly unknown[]) {
      const question = asQuestion(row);
      if (!current.has(question.questionId)) {
        current.set(question.questionId, question);
      }
    }
    return [...current.values()];
  }

  async safeQuestionsByIds(ids: readonly string[], now: Date) {
    if (ids.length === 0) return [];
    const rows = await this.db.toeicQuestionVersion.findMany({
      where: { ...practiceWhere(now), id: { in: [...ids] } },
      orderBy: { id: 'asc' },
      select: SAFE_QUESTION_SELECT,
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

  async snapshotQuestionsByIds(ids: readonly string[], now: Date) {
    if (ids.length === 0) return [];
    const rows = await this.db.toeicQuestionVersion.findMany({
      where: { ...practiceWhere(now), id: { in: [...ids] } },
      orderBy: { id: 'asc' },
      select: SAFE_QUESTION_SELECT,
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
      where: { ...practiceWhere(now), id: { in: [...ids] } },
      select: PRIVATE_QUESTION_SELECT,
    });
    return (rows as readonly DbPrivateQuestion[]).map(
      (row) =>
        ({
          id: row.id,
          options: row.options,
          correctAnswer: row.correctAnswer,
        }) satisfies ReadingPrivateQuestion,
    );
  }

  async findSession(id: string, userId: string) {
    const row = await this.db.toeicReadingPracticeSession.findFirst({
      where: { id, userId },
      select: SESSION_SELECT,
    });
    return row ? asSession(row) : null;
  }

  async findGradingSession(id: string, userId: string) {
    const row = await this.db.toeicReadingPracticeSession.findFirst({
      where: { id, userId },
      select: GRADING_SESSION_SELECT,
    });
    return row ? asGradingSession(row) : null;
  }

  async findByClient(userId: string, clientSessionId: string) {
    const row = await this.db.toeicReadingPracticeSession.findUnique({
      where: { userId_clientSessionId: { userId, clientSessionId } },
      select: SESSION_SELECT,
    });
    return row ? asSession(row) : null;
  }

  async createSession(input: ReadingSessionCreate) {
    const row = await this.db.toeicReadingPracticeSession.create({
      data: {
        userId: input.userId,
        clientSessionId: input.clientSessionId,
        readingPart: input.readingPart,
        questionIds: [...input.questionIds],
        total: input.total,
      },
      select: SESSION_SELECT,
    });
    return asSession(row);
  }

  async createAnswer(input: ReadingAnswerCreate) {
    return this.db.$transaction(async (transaction) => {
      const locked = await transaction.toeicReadingPracticeSession.updateMany({
        where: { id: input.sessionId, status: 'ACTIVE' },
        data: { score: null, submittedAt: null },
      });
      if (locked.count !== 1) return false;
      await transaction.toeicReadingPracticeAnswer.create({
        data: { ...input },
      });
      return true;
    });
  }

  async submitSession(
    id: string,
    userId: string,
    score: number,
    submittedAt: Date,
  ) {
    const result = await this.db.toeicReadingPracticeSession.updateMany({
      where: { id, userId, status: 'ACTIVE' },
      data: { status: 'SUBMITTED', score, submittedAt },
    });
    return result.count === 1;
  }
}
