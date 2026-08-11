import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  ErrorNotebookCapture,
  ErrorNotebookExplanation,
  ErrorNotebookQuery,
  PracticeAnswerInput,
  PracticeSessionState,
} from './practice.models';
import type {
  PracticeExplanationRepository,
  PracticeRepository,
} from './practice.ports';

const include = {
  answers: true,
  errors: true,
  user: { include: { learnerProgress: true } },
} as const;
type PracticeRecord = Prisma.PracticeSessionGetPayload<{
  include: typeof include;
}>;

function vietnamPracticeDay(value: Date) {
  const local = new Date(value.getTime() + 7 * 3_600_000);
  return new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()),
  );
}

function isUniqueConstraint(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

type ErrorNotebookCoverageRow = Readonly<{
  generalEntries: number;
  invalidToeicEntries: number;
  listeningEntries: number;
  readingEntries: number;
}>;

function state(record: PracticeRecord): PracticeSessionState {
  return {
    id: record.id,
    status: record.status,
    answeredQuestionIds: record.answers.map((answer) => answer.questionId),
    score: record.score,
    total: record.total,
    xpAwarded: record.xpAwarded,
    streakDays: record.user.learnerProgress?.streakDays ?? 0,
    errors: record.errors.map((entry) => ({
      questionId: entry.questionId,
      prompt: entry.prompt,
      selectedOption: entry.selectedOption,
      correctOption: entry.correctOption,
      explanation: entry.explanation,
    })),
  };
}

@Injectable()
export class PrismaPracticeRepository
  implements PracticeRepository, PracticeExplanationRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async findErrorNotebookExplanation(
    userId: string,
    source: 'PRACTICE' | 'TOEIC_TIMED_TEST' | undefined,
    questionId: string,
  ): Promise<ErrorNotebookExplanation | null> {
    if (!source) return null;
    const entry = await this.prisma.errorNotebookEntry.findFirst({
      where: { userId, source, questionId },
      select: { source: true, questionId: true, explanation: true },
    });
    return entry
      ? {
          source: entry.source,
          questionId: entry.questionId,
          explanation: entry.explanation,
        }
      : null;
  }

  async captureToeicErrors(input: ErrorNotebookCapture) {
    const questions = new Map(
      input.questions.map((question) => [question.questionId, question]),
    );
    const incorrect = input.answers.filter((answer) => !answer.isCorrect);
    if (incorrect.length === 0) return 0;

    return this.prisma.$transaction(async (tx) => {
      const session = await tx.toeicTimedTestSession.findFirst({
        where: {
          id: input.sessionId,
          userId: input.userId,
          status: { in: ['SUBMITTED', 'EXPIRED'] },
        },
        select: { id: true },
      });
      if (!session) return 0;

      let captured = 0;
      for (const answer of incorrect) {
        const question = questions.get(answer.questionId);
        if (!question) continue;
        const where = {
          toeicTimedTestSessionId_questionId: {
            toeicTimedTestSessionId: input.sessionId,
            questionId: answer.questionId,
          },
        } as const;
        try {
          await tx.errorNotebookEntry.upsert({
            where,
            create: {
              userId: input.userId,
              source: 'TOEIC_TIMED_TEST',
              toeicTimedTestSessionId: input.sessionId,
              questionId: answer.questionId,
              prompt: question.prompt,
              selectedOption: answer.selectedOption,
              correctOption: question.correctOption,
              explanation:
                question.explanation ||
                'Hãy xem lại kiến thức liên quan đến câu hỏi này.',
            },
            update: {},
          });
        } catch (error) {
          if (!isUniqueConstraint(error)) throw error;
          const existing = await tx.errorNotebookEntry.findUnique({
            where,
            select: { userId: true, source: true },
          });
          if (
            !existing ||
            existing.userId !== input.userId ||
            existing.source !== 'TOEIC_TIMED_TEST'
          ) {
            throw error;
          }
        }
        captured += 1;
      }
      return captured;
    });
  }

  async start(
    userId: string,
    clientSessionId: string,
    questionIds: readonly string[],
  ) {
    const practiceDay = vietnamPracticeDay(new Date());
    const dailyWhere = { userId_practiceDay: { userId, practiceDay } };
    const daily = await this.prisma.practiceSession.findUnique({
      where: dailyWhere,
      include,
    });
    if (daily) return state(daily);
    const where = { userId_clientSessionId: { userId, clientSessionId } };
    const existing = await this.prisma.practiceSession.findUnique({
      where,
      include,
    });
    if (existing) return state(existing);
    try {
      return state(
        await this.prisma.practiceSession.create({
          data: {
            userId,
            clientSessionId,
            practiceDay,
            questionIds: [...questionIds],
          },
          include,
        }),
      );
    } catch (error: unknown) {
      if (
        typeof error !== 'object' ||
        error === null ||
        !('code' in error) ||
        error.code !== 'P2002'
      )
        throw error;
      const winner = await this.prisma.practiceSession.findFirst({
        where: { userId, OR: [{ clientSessionId }, { practiceDay }] },
        include,
      });
      if (!winner) throw error;
      return state(winner);
    }
  }

  async answer(userId: string, sessionId: string, input: PracticeAnswerInput) {
    const session = await this.prisma.practiceSession.findFirst({
      where: { id: sessionId, userId, status: 'ACTIVE' },
    });
    if (!session) return null;
    const answer = await this.prisma.$transaction(async (tx) => {
      const persisted = await tx.practiceAnswer.upsert({
        where: {
          sessionId_questionId: { sessionId, questionId: input.questionId },
        },
        create: {
          sessionId,
          questionId: input.questionId,
          selectedOption: input.selectedOption,
          isCorrect: input.isCorrect,
        },
        update: {},
      });
      if (!persisted.isCorrect)
        await tx.errorNotebookEntry.upsert({
          where: {
            sessionId_questionId: { sessionId, questionId: input.questionId },
          },
          create: {
            userId,
            sessionId,
            questionId: input.questionId,
            prompt: input.prompt,
            selectedOption: persisted.selectedOption,
            correctOption: input.correctOption,
            explanation: input.explanation,
          },
          update: {},
        });
      return persisted;
    });
    const current = await this.result(userId, sessionId);
    return current
      ? {
          session: current,
          selectedOption: answer.selectedOption,
          isCorrect: answer.isCorrect,
        }
      : null;
  }

  async submit(userId: string, sessionId: string) {
    const session = await this.prisma.practiceSession.findFirst({
      where: { id: sessionId, userId },
      include: { answers: true },
    });
    if (!session) return null;
    if (session.status === 'SUBMITTED') return this.result(userId, sessionId);
    if (session.answers.length !== session.total) return null;
    const score = session.answers.filter(({ isCorrect }) => isCorrect).length;
    const xpAwarded = 10 + score * 10;
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const claim = await tx.practiceSession.updateMany({
        where: { id: sessionId, userId, status: 'ACTIVE' },
        data: { status: 'SUBMITTED', score, xpAwarded, submittedAt: now },
      });
      if (claim.count === 0) return;
      const progress = await tx.learnerProgress.findUnique({
        where: { userId },
      });
      const previous = progress?.lastPracticeOn;
      const today = vietnamPracticeDay(now).getTime();
      const prior = previous ? vietnamPracticeDay(previous).getTime() : null;
      const streakDays =
        prior === today
          ? (progress?.streakDays ?? 1)
          : prior === today - 86_400_000
            ? (progress?.streakDays ?? 0) + 1
            : 1;
      await tx.learnerProgress.upsert({
        where: { userId },
        create: { userId, xp: xpAwarded, streakDays, lastPracticeOn: now },
        update: {
          xp: { increment: xpAwarded },
          streakDays,
          lastPracticeOn: now,
        },
      });
    });
    return this.result(userId, sessionId);
  }

  async result(userId: string, sessionId: string) {
    const record = await this.prisma.practiceSession.findFirst({
      where: { id: sessionId, userId },
      include,
    });
    return record ? state(record) : null;
  }

  async summary(userId: string) {
    const [progress, completedSessions, reviewErrors] = await Promise.all([
      this.prisma.learnerProgress.findUnique({ where: { userId } }),
      this.prisma.practiceSession.count({
        where: { userId, status: 'SUBMITTED' },
      }),
      this.prisma.errorNotebookEntry.count({ where: { userId } }),
    ]);
    return {
      xp: progress?.xp ?? 0,
      streakDays: progress?.streakDays ?? 0,
      completedSessions,
      reviewErrors,
    };
  }

  async errors(userId: string, query: ErrorNotebookQuery) {
    const where = {
      userId,
      ...(query.source ? { source: query.source } : {}),
    };
    const queryRaw = (
      this.prisma as typeof this.prisma & {
        $queryRaw?: <T = unknown>(
          query: TemplateStringsArray,
          ...values: readonly unknown[]
        ) => Promise<T>;
      }
    ).$queryRaw;
    const [total, entries, coverageRows] = await Promise.all([
      this.prisma.errorNotebookEntry.count({ where }),
      this.prisma.errorNotebookEntry.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.size,
        take: query.size,
        select: {
          questionId: true,
          prompt: true,
          selectedOption: true,
          correctOption: true,
          explanation: true,
          source: true,
        },
      }),
      queryRaw
        ? queryRaw<ErrorNotebookCoverageRow[]>`
            SELECT
              COUNT(*) FILTER (WHERE e."source" = 'PRACTICE')::int AS "generalEntries",
              COUNT(*) FILTER (
                WHERE e."source" = 'TOEIC_TIMED_TEST'
                  AND (qv."id" IS NULL OR qv."part" NOT IN (
                    'PART_1', 'PART_2', 'PART_3', 'PART_4', 'PART_5', 'PART_6', 'PART_7'
                  ))
              )::int AS "invalidToeicEntries",
              COUNT(*) FILTER (
                WHERE e."source" = 'TOEIC_TIMED_TEST'
                  AND qv."part" IN ('PART_1', 'PART_2', 'PART_3', 'PART_4')
              )::int AS "listeningEntries",
              COUNT(*) FILTER (
                WHERE e."source" = 'TOEIC_TIMED_TEST'
                  AND qv."part" IN ('PART_5', 'PART_6', 'PART_7')
              )::int AS "readingEntries"
            FROM "ErrorNotebookEntry" e
            LEFT JOIN "ToeicQuestionVersion" qv ON qv."id" = e."questionId"
            WHERE e."userId" = ${userId}
          `
        : Promise.resolve<ErrorNotebookCoverageRow[] | null>(null),
    ]);
    const coverage = coverageRows?.[0];
    const coverageAvailable = coverage !== undefined && coverage !== null;
    const toeicMetadataValid =
      coverageAvailable && coverage.invalidToeicEntries === 0;
    const domain = (
      name: 'GENERAL' | 'LISTENING' | 'READING' | 'SPEAKING' | 'WRITING',
      count: number,
      supported = true,
    ) => ({
      domain: name,
      state: !supported
        ? ('unavailable' as const)
        : count > 0
          ? ('available' as const)
          : ('empty' as const),
      entryCount: supported ? count : 0,
    });
    const listening = toeicMetadataValid
      ? (coverage?.listeningEntries ?? 0)
      : 0;
    const reading = toeicMetadataValid ? (coverage?.readingEntries ?? 0) : 0;
    return {
      entries: entries.map((entry) => ({
        ...entry,
        remediation: {
          href: '/error-notebook',
          label:
            entry.source === 'TOEIC_TIMED_TEST'
              ? 'Ôn lỗi TOEIC'
              : 'Xem lại lỗi',
        },
      })),
      pagination: {
        page: query.page,
        size: query.size,
        total,
        hasNext: query.page * query.size < total,
      },
      coverage: {
        domains: [
          domain(
            'GENERAL',
            coverageAvailable ? (coverage?.generalEntries ?? 0) : 0,
            coverageAvailable,
          ),
          domain('LISTENING', listening, toeicMetadataValid),
          domain('READING', reading, toeicMetadataValid),
          domain('SPEAKING', 0, false),
          domain('WRITING', 0, false),
        ],
      },
    };
  }

  async roadmapAdaptiveEvidence(userId: string) {
    const page = await this.errors(userId, { page: 1, size: 1 });
    return {
      policyVersion: 'adaptive-roadmap-v1' as const,
      domains: page.coverage.domains.map((domain) => ({ ...domain })),
    };
  }
}
