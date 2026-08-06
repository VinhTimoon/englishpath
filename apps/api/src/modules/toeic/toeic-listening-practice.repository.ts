import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  ToeicDifficulty,
  ToeicPart,
  ToeicQuestionType,
} from '../../generated/prisma/enums';
import type {
  ToeicListeningPracticeRepository,
  ToeicListeningQuestion,
  ToeicPracticeAnswerCreate,
  ToeicPracticeSessionCreate,
  ToeicPracticeSessionRecord,
  ToeicPrivateQuestion,
} from './toeic-listening-practice.models';
import { toeicEligibleWhere } from './toeic-eligibility.policy';

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
  listeningPart: ToeicPart | null;
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
  mediaReference: string | null;
};

type DbPrivateQuestion = {
  id: string;
  options: unknown;
  correctAnswer: string;
};

type PracticeDb = {
  $transaction<T>(
    callback: (transaction: PracticeTransaction) => Promise<T>,
  ): Promise<T>;
  toeicQuestionVersion: {
    findMany(args: Record<string, unknown>): Promise<unknown>;
  };
  toeicPracticeSession: {
    findFirst(args: Record<string, unknown>): Promise<unknown>;
    findUnique(args: Record<string, unknown>): Promise<unknown>;
    create(args: Record<string, unknown>): Promise<unknown>;
    updateMany(args: Record<string, unknown>): Promise<{ count: number }>;
  };
  toeicPracticeAnswer: {
    create(args: Record<string, unknown>): Promise<unknown>;
  };
};

type PracticeTransaction = {
  toeicPracticeSession: {
    updateMany(args: Record<string, unknown>): Promise<{ count: number }>;
  };
  toeicPracticeAnswer: {
    create(args: Record<string, unknown>): Promise<unknown>;
  };
};

const SESSION_SELECT = {
  id: true,
  userId: true,
  clientSessionId: true,
  listeningPart: true,
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
  mediaReference: true,
} as const;
const PRIVATE_QUESTION_SELECT = {
  id: true,
  options: true,
  correctAnswer: true,
} as const;

function eligibleWhere(now: Date, listeningPart?: ToeicPart) {
  return toeicEligibleWhere(now, {
    listeningPart,
    practiceEligible: true,
  });
}

function asSession(value: unknown): ToeicPracticeSessionRecord {
  const record = value as DbSession;
  return {
    id: record.id,
    userId: record.userId,
    clientSessionId: record.clientSessionId,
    listeningPart: record.listeningPart,
    questionIds: [...record.questionIds],
    status: record.status,
    total: record.total,
    score: record.score,
    startedAt: record.startedAt,
    submittedAt: record.submittedAt,
    answers: record.answers.map((answer) => ({ ...answer })),
  };
}

function asQuestion(value: unknown): ToeicListeningQuestion {
  const question = value as DbQuestion;
  return {
    id: question.id,
    questionId: question.questionId,
    prompt: question.prompt,
    options: question.options,
    part: question.part,
    questionType: question.questionType,
    difficulty: question.difficulty,
    mediaReference: question.mediaReference,
  };
}

@Injectable()
export class PrismaToeicListeningPracticeRepository implements ToeicListeningPracticeRepository {
  private readonly db: PracticeDb;

  constructor(prisma: PrismaService) {
    this.db = prisma as unknown as PracticeDb;
  }

  async eligibleQuestions(now: Date, listeningPart?: ToeicPart) {
    const rows = await this.db.toeicQuestionVersion.findMany({
      where: eligibleWhere(now, listeningPart),
      orderBy: [{ questionId: 'asc' }, { version: 'desc' }],
      select: SAFE_QUESTION_SELECT,
    });
    const current = new Map<string, ToeicListeningQuestion>();
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
      where: { ...eligibleWhere(now), id: { in: [...ids] } },
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
      where: { ...eligibleWhere(now), id: { in: [...ids] } },
      select: PRIVATE_QUESTION_SELECT,
    });
    return (rows as readonly DbPrivateQuestion[]).map((row) => ({
      id: row.id,
      options: row.options,
      correctAnswer: row.correctAnswer,
    })) satisfies readonly ToeicPrivateQuestion[];
  }

  async findSession(id: string, userId: string) {
    const row = await this.db.toeicPracticeSession.findFirst({
      where: { id, userId },
      select: SESSION_SELECT,
    });
    return row ? asSession(row) : null;
  }

  async findByClient(userId: string, clientSessionId: string) {
    const row = await this.db.toeicPracticeSession.findUnique({
      where: { userId_clientSessionId: { userId, clientSessionId } },
      select: SESSION_SELECT,
    });
    return row ? asSession(row) : null;
  }

  async createSession(input: ToeicPracticeSessionCreate) {
    const row = await this.db.toeicPracticeSession.create({
      data: {
        userId: input.userId,
        clientSessionId: input.clientSessionId,
        listeningPart: input.listeningPart,
        questionIds: [...input.questionIds],
        total: input.total,
      },
      select: SESSION_SELECT,
    });
    return asSession(row);
  }

  async createAnswer(input: ToeicPracticeAnswerCreate) {
    return this.db.$transaction(async (transaction) => {
      const locked = await transaction.toeicPracticeSession.updateMany({
        where: { id: input.sessionId, status: 'ACTIVE' },
        data: { score: null, submittedAt: null },
      });
      if (locked.count !== 1) return false;
      await transaction.toeicPracticeAnswer.create({
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
    const result = await this.db.toeicPracticeSession.updateMany({
      where: { id, userId, status: 'ACTIVE' },
      data: { status: 'SUBMITTED', score, submittedAt },
    });
    return result.count === 1;
  }
}
