jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import type { PrismaService } from '../../prisma/prisma.service';
import { PrismaToeicAdminRepository } from './toeic-admin.repository';
import {
  ToeicReviewStatus,
  ToeicPublicationState,
} from '../../generated/prisma/enums';

describe('PrismaToeicAdminRepository', () => {
  it('uses explicit governance projections and transactional question creation', async () => {
    type CreateArgs = {
      data: Record<string, unknown>;
      select: Record<string, boolean>;
    };
    const create = jest.fn((args: CreateArgs) => {
      void args;
      return Promise.resolve({ id: 'version-1' });
    });
    const upsert = jest.fn().mockResolvedValue({ id: 'question-1' });
    const transaction = {
      toeicQuestion: { upsert },
      toeicQuestionVersion: { create },
    };
    const prisma = {
      $transaction: jest.fn(
        async (callback: (tx: typeof transaction) => Promise<unknown>) =>
          callback(transaction),
      ),
      toeicQuestionVersion: {
        findUnique: jest.fn(),
        updateMany: jest.fn(),
      },
    } as unknown as PrismaService;
    const repository = new PrismaToeicAdminRepository(prisma);

    await repository.create({
      id: 'version-1',
      questionId: 'question-1',
      version: 1,
      previousVersionId: null,
      importIdentity: 'importer:batch',
      part: 'PART_5',
      questionType: 'INCOMPLETE_SENTENCE',
      difficulty: 'INTERMEDIATE',
      topic: 'workplace',
      stimulusGroup: null,
      prompt: 'Prompt',
      options: [{ id: 'A', text: 'Answer' }],
      mediaReference: null,
      explanation: null,
      correctAnswer: 'A',
      sourceIdentity: 'source',
      sourceUrl: null,
      checksum: 'checksum-12345678',
      sourceVersion: '2026-08',
      provenance: 'licensed',
      rightsOwner: 'owner',
      licenseStatus: 'APPROVED',
      allowedUsageScopes: ['PRACTICE'],
      accessTier: 'FREE',
      reviewStatus: 'DRAFT',
      publicationState: 'UNPUBLISHED',
      validUntil: null,
    });

    expect(upsert).toHaveBeenCalledWith({
      where: { id: 'question-1' },
      update: {},
      create: { id: 'question-1' },
    });
    const createCall = create.mock.calls[0]?.[0];
    expect(createCall).toBeDefined();
    if (!createCall) throw new Error('create was not called');
    expect(createCall.data.correctAnswer).toBe('A');
    expect(createCall.select.correctAnswer).toBe(true);
    expect(createCall.select.rightsOwner).toBe(true);
  });

  it('uses compare-and-set predicates for review and publication', async () => {
    type UpdateArgs = {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    };
    const updateMany = jest.fn((args: UpdateArgs) => {
      void args;
      return Promise.resolve({ count: 1 });
    });
    const findUnique = jest.fn().mockResolvedValue({ id: 'version-1' });
    const prisma = {
      toeicQuestionVersion: { findUnique, updateMany },
    } as unknown as PrismaService;
    const repository = new PrismaToeicAdminRepository(prisma);

    await repository.review(
      'version-1',
      { checksum: 'checksum-12345678', sourceVersion: '2026-08' },
      {
        reviewStatus: ToeicReviewStatus.REVIEWED,
        reviewDecision: 'APPROVE',
        reviewEvidence: '{}',
        reviewerIdentity: 'reviewer-1',
        reviewedAt: new Date(),
      },
    );
    await repository.publish(
      'version-1',
      { checksum: 'checksum-12345678', sourceVersion: '2026-08' },
      {
        publicationState: ToeicPublicationState.PUBLISHED,
        publishedAt: new Date(),
      },
    );

    const reviewCall = updateMany.mock.calls[0]?.[0];
    const publishCall = updateMany.mock.calls[1]?.[0];
    expect(reviewCall).toBeDefined();
    expect(publishCall).toBeDefined();
    if (!reviewCall || !publishCall) throw new Error('updates were not called');
    expect(reviewCall.where).toMatchObject({
      reviewStatus: 'DRAFT',
      publicationState: 'UNPUBLISHED',
    });
    expect(publishCall.where).toMatchObject({
      reviewStatus: 'REVIEWED',
      reviewDecision: 'APPROVE',
      licenseStatus: 'APPROVED',
    });
  });
});
