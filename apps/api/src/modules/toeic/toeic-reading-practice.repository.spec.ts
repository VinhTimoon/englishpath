jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import type { PrismaService } from '../../prisma/prisma.service';
import { ToeicPart } from '../../generated/prisma/enums';
import { PrismaToeicReadingPracticeRepository } from './toeic-reading-practice.repository';

describe('PrismaToeicReadingPracticeRepository', () => {
  it('selects governed free practice Parts 5-7 and no answer key for safe rows', async () => {
    const findMany = jest
      .fn<Promise<readonly unknown[]>, [Record<string, unknown>]>()
      .mockResolvedValue([]);
    const prisma = {
      toeicQuestionVersion: { findMany },
    } as unknown as PrismaService;
    const repository = new PrismaToeicReadingPracticeRepository(prisma);
    const now = new Date('2026-08-06T00:00:00.000Z');

    await repository.eligibleQuestions(now);
    const args = findMany.mock.calls[0]?.[0];
    if (!args) throw new Error('question selection was not called');
    expect(args.where).toMatchObject({
      reviewStatus: 'REVIEWED',
      publicationState: 'PUBLISHED',
      licenseStatus: 'APPROVED',
      allowedUsageScopes: { has: 'PRACTICE' },
      accessTier: 'FREE',
      part: {
        in: ['PART_5', 'PART_6', 'PART_7'],
      },
    });
    expect(args.select).not.toHaveProperty('correctAnswer');
  });

  it('deduplicates canonical questions while preserving the newest ordered version', async () => {
    const findMany = jest
      .fn<Promise<readonly unknown[]>, [Record<string, unknown>]>()
      .mockResolvedValue([
        {
          id: 'version-2',
          questionId: 'question-1',
          prompt: 'new',
          options: [
            { id: 'A', text: 'A' },
            { id: 'B', text: 'B' },
          ],
          part: ToeicPart.PART_5,
          questionType: 'INCOMPLETE_SENTENCE',
          difficulty: 'ELEMENTARY',
          topic: 'office',
          stimulusGroup: null,
          mediaReference: null,
          explanation: 'safe',
        },
        {
          id: 'version-1',
          questionId: 'question-1',
          prompt: 'old',
          options: [
            { id: 'A', text: 'A' },
            { id: 'B', text: 'B' },
          ],
          part: ToeicPart.PART_5,
          questionType: 'INCOMPLETE_SENTENCE',
          difficulty: 'ELEMENTARY',
          topic: 'office',
          stimulusGroup: null,
          mediaReference: null,
          explanation: 'safe',
        },
      ]);
    const prisma = {
      toeicQuestionVersion: { findMany },
    } as unknown as PrismaService;
    const result = await new PrismaToeicReadingPracticeRepository(
      prisma,
    ).eligibleQuestions(new Date());
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('version-2');
  });

  it.each([ToeicPart.PART_6, ToeicPart.PART_7])(
    'applies the exact reading part filter for %s',
    async (part) => {
      const findMany = jest
        .fn<Promise<readonly unknown[]>, [Record<string, unknown>]>()
        .mockResolvedValue([]);
      const prisma = {
        toeicQuestionVersion: { findMany },
      } as unknown as PrismaService;
      await new PrismaToeicReadingPracticeRepository(prisma).eligibleQuestions(
        new Date(),
        part,
      );
      const args = findMany.mock.calls[0]?.[0];
      if (!args) throw new Error('part selection was not called');
      expect(args.where).toMatchObject({ part });
    },
  );

  it('uses explicit private selects and locks an active session before answer insertion', async () => {
    const questionFindMany = jest
      .fn<Promise<readonly unknown[]>, [Record<string, unknown>]>()
      .mockResolvedValue([
        {
          id: 'version-1',
          options: [{ id: 'A', text: 'A' }],
          correctAnswer: 'A',
        },
      ]);
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const create = jest.fn().mockResolvedValue({});
    const prisma = {
      toeicQuestionVersion: { findMany: questionFindMany },
      $transaction: async (
        callback: (transaction: unknown) => Promise<boolean>,
      ) =>
        callback({
          toeicReadingPracticeSession: { updateMany },
          toeicReadingPracticeAnswer: { create },
        }),
    } as unknown as PrismaService;
    const repository = new PrismaToeicReadingPracticeRepository(prisma);

    const privateRows = await repository.privateQuestionsByIds(
      ['version-1'],
      new Date(),
    );
    const inserted = await repository.createAnswer({
      sessionId: 'session-1',
      questionId: 'version-1',
      selectedOption: 'A',
      isCorrect: true,
    });
    expect(privateRows[0]).toMatchObject({ correctAnswer: 'A' });
    expect(questionFindMany.mock.calls[0]?.[0].select).toEqual({
      id: true,
      options: true,
      correctAnswer: true,
    });
    expect(inserted).toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'session-1', status: 'ACTIVE' },
      data: { score: null, submittedAt: null },
    });
    expect(create).toHaveBeenCalled();
  });

  it('prevents an answer insertion when a concurrent submit wins the active-state race', async () => {
    let status: 'ACTIVE' | 'SUBMITTED' = 'ACTIVE';
    const answerCreate = jest.fn().mockResolvedValue({});
    const sessionUpdateMany = jest.fn((args: Record<string, unknown>) => {
      const where = args.where as { status?: string };
      if (where.status !== status) return Promise.resolve({ count: 0 });
      return Promise.resolve({ count: 1 });
    });
    const submitUpdateMany = jest.fn((args: Record<string, unknown>) => {
      const where = args.where as { status?: string };
      if (where.status !== status) return Promise.resolve({ count: 0 });
      status = 'SUBMITTED';
      return Promise.resolve({ count: 1 });
    });
    const prisma = {
      $transaction: async (
        callback: (transaction: unknown) => Promise<boolean>,
      ) =>
        callback({
          toeicReadingPracticeSession: { updateMany: sessionUpdateMany },
          toeicReadingPracticeAnswer: { create: answerCreate },
        }),
      toeicReadingPracticeSession: { updateMany: submitUpdateMany },
    } as unknown as PrismaService;
    const repository = new PrismaToeicReadingPracticeRepository(prisma);

    const [submitted, inserted] = await Promise.all([
      repository.submitSession('session-1', 'learner-1', 1, new Date()),
      repository.createAnswer({
        sessionId: 'session-1',
        questionId: 'version-1',
        selectedOption: 'A',
        isCorrect: true,
      }),
    ]);

    expect(submitted).toBe(true);
    expect(inserted).toBe(false);
    expect(answerCreate).not.toHaveBeenCalled();
  });

  it('keeps correctness out of safe session reads and exposes it only to grading reads', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const prisma = {
      toeicReadingPracticeSession: { findFirst },
    } as unknown as PrismaService;
    const repository = new PrismaToeicReadingPracticeRepository(prisma);

    await repository.findSession('session-1', 'learner-1');
    const calls = findFirst.mock.calls as Array<[Record<string, unknown>]>;
    const safeArgs = calls[0]?.[0] as {
      select: { answers: { select: Record<string, unknown> } };
    };
    expect(safeArgs.select.answers.select).not.toHaveProperty('isCorrect');

    await repository.findGradingSession('session-1', 'learner-1');
    const gradingArgs = calls[1]?.[0] as {
      select: { answers: { select: Record<string, unknown> } };
    };
    expect(gradingArgs.select.answers.select).toHaveProperty('isCorrect', true);
  });
});
