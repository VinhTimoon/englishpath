jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import type { PrismaService } from '../../prisma/prisma.service';
import { ToeicPart } from '../../generated/prisma/enums';
import { PrismaToeicListeningPracticeRepository } from './toeic-listening-practice.repository';

describe('PrismaToeicListeningPracticeRepository', () => {
  it('selects only reviewed, published, approved, free practice listening content', async () => {
    const findMany = jest
      .fn<Promise<readonly unknown[]>, [Record<string, unknown>]>()
      .mockResolvedValue([]);
    const prisma = {
      toeicQuestionVersion: { findMany },
    } as unknown as PrismaService;
    const repository = new PrismaToeicListeningPracticeRepository(prisma);
    const now = new Date('2026-08-06T00:00:00.000Z');

    await repository.eligibleQuestions(now);

    const args = findMany.mock.calls[0]?.[0];
    if (!args) throw new Error('findMany was not called');
    expect(args.where).toMatchObject({
      reviewStatus: 'REVIEWED',
      publicationState: 'PUBLISHED',
      licenseStatus: 'APPROVED',
      allowedUsageScopes: { has: 'PRACTICE' },
      accessTier: 'FREE',
      part: { in: ['PART_1', 'PART_2', 'PART_3', 'PART_4'] },
      publishedAt: { lte: now },
    });
    const select = args.select;
    expect(select).not.toHaveProperty('correctAnswer');
  });

  it('uses a private select only inside answer grading and keeps session updates compare-and-set', async () => {
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
    const prisma = {
      toeicQuestionVersion: { findMany: questionFindMany },
      toeicPracticeSession: { updateMany },
    } as unknown as PrismaService;
    const repository = new PrismaToeicListeningPracticeRepository(prisma);

    await repository.privateQuestionsByIds(['version-1'], new Date());
    await repository.submitSession('session-1', 'learner-1', 1, new Date());

    const questionArgs = questionFindMany.mock.calls[0]?.[0];
    if (!questionArgs) throw new Error('question findMany was not called');
    expect(questionArgs.select).toEqual({
      id: true,
      options: true,
      correctAnswer: true,
    });
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'session-1', userId: 'learner-1', status: 'ACTIVE' },
      }),
    );
  });

  it('keeps only the newest eligible version for each canonical question', async () => {
    const findMany = jest
      .fn<Promise<readonly unknown[]>, [Record<string, unknown>]>()
      .mockResolvedValue([
        {
          id: 'version-2',
          questionId: 'question-1',
          prompt: 'New',
          options: [
            { id: 'A', text: 'A' },
            { id: 'B', text: 'B' },
          ],
          part: ToeicPart.PART_1,
          questionType: 'PHOTO_DESCRIPTION',
          difficulty: 'ELEMENTARY',
          mediaReference: null,
        },
        {
          id: 'version-1',
          questionId: 'question-1',
          prompt: 'Old',
          options: [
            { id: 'A', text: 'A' },
            { id: 'B', text: 'B' },
          ],
          part: ToeicPart.PART_1,
          questionType: 'PHOTO_DESCRIPTION',
          difficulty: 'ELEMENTARY',
          mediaReference: null,
        },
      ]);
    const prisma = {
      toeicQuestionVersion: { findMany },
    } as unknown as PrismaService;
    const result = await new PrismaToeicListeningPracticeRepository(
      prisma,
    ).eligibleQuestions(new Date());
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('version-2');
  });

  it('uses an explicit session scalar and answer select without a broad include', async () => {
    type SessionArgs = Record<string, unknown>;
    const findFirst = jest
      .fn<Promise<unknown>, [SessionArgs]>()
      .mockResolvedValue(null);
    const findUnique = jest
      .fn<Promise<unknown>, [SessionArgs]>()
      .mockResolvedValue(null);
    const prisma = {
      toeicPracticeSession: { findFirst, findUnique },
    } as unknown as PrismaService;
    const repository = new PrismaToeicListeningPracticeRepository(prisma);

    await repository.findSession('session-1', 'learner-1');
    await repository.findByClient('learner-1', 'client-1');

    for (const args of [
      findFirst.mock.calls[0]?.[0],
      findUnique.mock.calls[0]?.[0],
    ]) {
      if (!args) throw new Error('session read was not called');
      expect(args).toHaveProperty('select.answers.select.isCorrect', true);
      expect(args).not.toHaveProperty('include');
      expect(args).not.toHaveProperty('select.answers.select.correctAnswer');
    }
  });

  it('preserves requested question order when rebuilding a safe session projection', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 'version-2',
        questionId: 'question-2',
        prompt: 'Second',
        options: [{ id: 'A', text: 'A' }],
        part: ToeicPart.PART_2,
        questionType: 'QUESTION_RESPONSE',
        difficulty: 'ELEMENTARY',
        mediaReference: null,
      },
      {
        id: 'version-1',
        questionId: 'question-1',
        prompt: 'First',
        options: [{ id: 'A', text: 'A' }],
        part: ToeicPart.PART_1,
        questionType: 'PHOTO_DESCRIPTION',
        difficulty: 'ELEMENTARY',
        mediaReference: null,
      },
    ]);
    const prisma = {
      toeicQuestionVersion: { findMany },
    } as unknown as PrismaService;
    const repository = new PrismaToeicListeningPracticeRepository(prisma);
    const result = await repository.safeQuestionsByIds(
      ['version-1', 'version-2'],
      new Date(),
    );

    expect(result.map((item) => item.id)).toEqual(['version-1', 'version-2']);
  });

  it('locks an active session before inserting an answer', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const create = jest.fn().mockResolvedValue({});
    const prisma = {
      $transaction: async (
        callback: (transaction: unknown) => Promise<boolean>,
      ) =>
        callback({
          toeicPracticeSession: { updateMany },
          toeicPracticeAnswer: { create },
        }),
    } as unknown as PrismaService;
    const repository = new PrismaToeicListeningPracticeRepository(prisma);

    const inserted = await repository.createAnswer({
      sessionId: 'session-1',
      questionId: 'version-1',
      selectedOption: 'A',
      isCorrect: true,
    });
    expect(inserted).toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'session-1', status: 'ACTIVE' },
      data: { score: null, submittedAt: null },
    });
    expect(create).toHaveBeenCalled();
  });
});
