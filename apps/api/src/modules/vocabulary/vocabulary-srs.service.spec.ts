import { ConflictException, NotFoundException } from '@nestjs/common';
import { createApplicationPrincipal } from '../access';
import { VocabularySrsService } from './vocabulary-srs.service';

describe('VocabularySrsService', () => {
  const principal = createApplicationPrincipal({
    applicationUserId: 'learner-1',
    externalIdentity: {
      provider: 'local',
      subject: 'learner-1',
      issuer: 'local',
      audience: 'englishpath',
    },
    roles: ['learner'],
    ownerships: [],
    entitlements: [],
  });
  const item = {
    id: 'word-1',
    word: 'reliable',
    meaning: 'đáng tin cậy',
    example: null,
    pronunciation: null,
  };

  it('calculates scheduling on the server and preserves missing optional data', async () => {
    const repository = {
      findPublished: jest.fn().mockResolvedValue(item),
      findState: jest.fn().mockResolvedValue({ mastery: 20, repetitions: 1 }),
      review: jest
        .fn()
        .mockImplementation((input: { quality: number; result: unknown }) => ({
          replayed: false,
          existing: { quality: input.quality, result: input.result },
        })),
      listDue: jest.fn(),
    };
    const result = await new VocabularySrsService(repository).review(
      principal,
      'word-1',
      3,
      'submission-1',
    );

    expect(result.idempotencyStatus).toBe('created');
    expect(result.data).toMatchObject({
      ...item,
      mastery: 55,
      repetitions: 2,
      intervalDays: 3,
    });
    expect(repository.review).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'learner-1',
        vocabularyId: 'word-1',
        quality: 3,
      }),
    );
  });

  it('replays the original result and rejects a conflicting quality', async () => {
    const original = {
      ...item,
      mastery: 25,
      repetitions: 1,
      intervalDays: 1,
      nextReviewAt: new Date('2026-07-27T00:00:00Z'),
    };
    const repository = {
      findPublished: jest.fn().mockResolvedValue(item),
      findState: jest.fn().mockResolvedValue(null),
      review: jest.fn().mockResolvedValue({
        replayed: true,
        existing: { quality: 2, result: original },
      }),
      listDue: jest.fn(),
    };
    const service = new VocabularySrsService(repository);

    await expect(
      service.review(principal, 'word-1', 2, 'submission-1'),
    ).resolves.toEqual({ data: original, idempotencyStatus: 'replayed' });
    await expect(
      service.review(principal, 'word-1', 3, 'submission-1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not review unpublished or unknown items', async () => {
    const repository = {
      findPublished: jest.fn().mockResolvedValue(null),
      findState: jest.fn(),
      review: jest.fn(),
      listDue: jest.fn(),
    };
    await expect(
      new VocabularySrsService(repository as never).review(
        principal,
        'private-word',
        2,
        'submission-1',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.review).not.toHaveBeenCalled();
  });
});
