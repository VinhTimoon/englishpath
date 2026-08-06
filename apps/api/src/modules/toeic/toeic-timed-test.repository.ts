import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { toeicEligibleWhere } from './toeic-eligibility.policy';
import type {
  ToeicTimedTestRepository,
  TimedSession,
} from './toeic-timed-test.models';
@Injectable()
export class PrismaToeicTimedTestRepository implements ToeicTimedTestRepository {
  constructor(private readonly db: PrismaService) {}
  async eligibleQuestions(now: Date) {
    return this.db.toeicQuestionVersion.findMany({
      where: toeicEligibleWhere(now, {
        usageScope: 'MOCK_TEST',
        accessTier: 'FREE',
      }),
      orderBy: [{ questionId: 'asc' }, { version: 'desc' }, { id: 'asc' }],
      distinct: ['questionId'],
      select: {
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
        correctAnswer: true,
      },
    }) as any;
  }
  private select = {
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
  async findByClient(userId: string, clientSessionId: string) {
    const x = await (this.db as any).toeicTimedTestSession.findUnique({
      where: { userId_clientSessionId: { userId, clientSessionId } },
      select: this.select,
    });
    return x as TimedSession | null;
  }
  async find(id: string, userId: string) {
    const x = await (this.db as any).toeicTimedTestSession.findFirst({
      where: { id, userId },
      select: this.select,
    });
    return x as TimedSession | null;
  }
  async create(input: any) {
    return (await (this.db as any).toeicTimedTestSession.create({
      data: input,
      select: this.select,
    })) as TimedSession;
  }
  async answer(
    sessionId: string,
    questionId: string,
    selectedOption: string,
    isCorrect: boolean,
    at: Date,
  ) {
    const tx: any = this.db;
    const s = await tx.toeicTimedTestSession.findFirst({
      where: { id: sessionId, status: 'ACTIVE' },
    });
    if (!s) return 'closed';
    const old = await tx.toeicTimedTestAnswer.findUnique({
      where: { sessionId_questionId: { sessionId, questionId } },
    });
    if (old)
      return old.selectedOption === selectedOption ? 'replayed' : 'conflict';
    await tx.toeicTimedTestAnswer.create({
      data: {
        sessionId,
        questionId,
        selectedOption,
        isCorrect,
        answeredAt: at,
      },
    });
    return 'created';
  }
  async finalize(
    id: string,
    userId: string,
    status: any,
    score: number,
    at: Date,
  ) {
    const r = await (this.db as any).toeicTimedTestSession.updateMany({
      where: { id, userId, status: 'ACTIVE' },
      data: { status, score, finalizedAt: at },
    });
    return r.count === 1;
  }
}
