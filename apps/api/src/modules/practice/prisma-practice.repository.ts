import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  PracticeAnswerInput,
  PracticeSessionState,
} from './practice.models';
import type { PracticeRepository } from './practice.ports';

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
export class PrismaPracticeRepository implements PracticeRepository {
  constructor(private readonly prisma: PrismaService) {}

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

  async errors(userId: string) {
    return this.prisma.errorNotebookEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        questionId: true,
        prompt: true,
        selectedOption: true,
        correctOption: true,
        explanation: true,
      },
    });
  }
}
