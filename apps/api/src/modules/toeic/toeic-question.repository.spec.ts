jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import type { PrismaService } from '../../prisma/prisma.service';
import {
  ToeicDifficulty,
  ToeicPart,
  ToeicQuestionType,
} from '../../generated/prisma/enums';
import { PrismaToeicQuestionRepository } from './toeic-question.repository';

function row(
  questionId: string,
  version: number,
  part: ToeicPart = ToeicPart.PART_1,
) {
  return {
    id: `${questionId}-v${version}`,
    questionId,
    version,
    part,
    questionType: ToeicQuestionType.PHOTO_DESCRIPTION,
    difficulty: ToeicDifficulty.ELEMENTARY,
    topic: 'office',
    stimulusGroup: null,
    prompt: 'Prompt',
    options: [{ id: 'A', text: 'Option A' }],
    mediaReference: null,
    explanation: 'Explanation',
  };
}

describe('PrismaToeicQuestionRepository', () => {
  it('selects eligible rows, keeps the newest version, filters, and paginates', async () => {
    type FindManyArgs = {
      where: Record<string, unknown>;
      orderBy: readonly unknown[];
      select: Record<string, boolean>;
    };
    const findMany = jest.fn((args: FindManyArgs) => {
      void args;
      return [row('q-1', 2), row('q-1', 1), row('q-2', 1, ToeicPart.PART_2)];
    });
    const prisma = {
      toeicQuestionVersion: { findMany, findFirst: jest.fn() },
    } as unknown as PrismaService;
    const repository = new PrismaToeicQuestionRepository(prisma);
    const now = new Date('2026-08-06T00:00:00.000Z');

    const result = await repository.list({
      page: 1,
      size: 1,
      skip: 0,
      take: 1,
      now,
      part: ToeicPart.PART_1,
    });

    expect(result).toEqual({ items: [row('q-1', 2)], totalItems: 1 });
    const findManyCall = findMany.mock.calls[0]?.[0];
    expect(findManyCall).toBeDefined();
    if (!findManyCall) throw new Error('findMany was not called');
    expect(findManyCall.where).toMatchObject({
      reviewStatus: 'REVIEWED',
      publicationState: 'PUBLISHED',
      licenseStatus: 'APPROVED',
      publishedAt: { lte: now },
    });
    expect(findManyCall.orderBy).toEqual([
      { questionId: 'asc' },
      { version: 'desc' },
    ]);
    expect(findManyCall.select).toMatchObject({
      prompt: true,
      options: true,
      explanation: true,
    });
    expect(findManyCall.select).not.toHaveProperty('correctAnswer');
    expect(findManyCall.select).not.toHaveProperty('rightsOwner');
  });

  it('finds the current eligible version by canonical question ID', async () => {
    type FindFirstArgs = {
      where: Record<string, unknown>;
      orderBy: Record<string, unknown>;
      select: Record<string, boolean>;
    };
    const findFirst = jest.fn((args: FindFirstArgs) => {
      void args;
      return row('q-1', 2);
    });
    const prisma = {
      toeicQuestionVersion: { findMany: jest.fn(), findFirst },
    } as unknown as PrismaService;
    const repository = new PrismaToeicQuestionRepository(prisma);

    await repository.find('q-1', new Date('2026-08-06T00:00:00.000Z'));

    const findFirstCall = findFirst.mock.calls[0]?.[0];
    expect(findFirstCall).toBeDefined();
    if (!findFirstCall) throw new Error('findFirst was not called');
    expect(findFirstCall.where).toMatchObject({ questionId: 'q-1' });
    expect(findFirstCall.orderBy).toEqual({ version: 'desc' });
  });
});
