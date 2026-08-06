jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { ToeicDifficulty, ToeicPart } from '../../generated/prisma/enums';
import { PrismaToeicPracticeCatalogueRepository } from './toeic-practice-catalogue.repository';

describe('PrismaToeicPracticeCatalogueRepository', () => {
  it('deduplicates canonical versions and returns governed filter values', async () => {
    const findMany = jest
      .fn<Promise<readonly unknown[]>, [Record<string, unknown>]>()
      .mockResolvedValue([
        {
          questionId: 'q-1',
          part: ToeicPart.PART_1,
          difficulty: ToeicDifficulty.BEGINNER,
          topic: null,
        },
        {
          questionId: 'q-1',
          part: ToeicPart.PART_1,
          difficulty: ToeicDifficulty.ADVANCED,
          topic: null,
        },
        {
          questionId: 'q-2',
          part: ToeicPart.PART_5,
          difficulty: ToeicDifficulty.ELEMENTARY,
          topic: 'workplace',
        },
        {
          questionId: 'q-3',
          part: ToeicPart.PART_7,
          difficulty: ToeicDifficulty.INTERMEDIATE,
          topic: ' travel ',
        },
      ]);
    const repository = new PrismaToeicPracticeCatalogueRepository({
      toeicQuestionVersion: { findMany },
    } as never);

    await expect(
      repository.catalogue(new Date('2026-08-06T00:00:00.000Z')),
    ).resolves.toEqual({
      listening: {
        parts: [ToeicPart.PART_1],
        difficulties: [ToeicDifficulty.BEGINNER],
      },
      reading: {
        parts: [ToeicPart.PART_5, ToeicPart.PART_7],
        difficulties: [
          ToeicDifficulty.ELEMENTARY,
          ToeicDifficulty.INTERMEDIATE,
        ],
        topics: [' travel ', 'workplace'],
      },
    });
    const args = findMany.mock.calls[0]?.[0];
    expect(args.where).toMatchObject({
      reviewStatus: 'REVIEWED',
      publicationState: 'PUBLISHED',
      licenseStatus: 'APPROVED',
      allowedUsageScopes: { has: 'PRACTICE' },
      accessTier: 'FREE',
    });
  });
});
