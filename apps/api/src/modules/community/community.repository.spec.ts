jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import type { PrismaService } from '../../prisma/prisma.service';
import { CommunityRepository } from './community.repository';

describe('CommunityRepository', () => {
  it('replays owner-scoped post creation and rejects a changed request', async () => {
    const existing = {
      id: 'post-1',
      ownerUserId: 'owner-1',
      creationRequestHash: 'different',
    };
    const tx = {
      communityPost: {
        findFirst: jest.fn().mockResolvedValue(existing),
        create: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    } as unknown as PrismaService;
    const repository = new CommunityRepository(prisma);

    await expect(
      repository.create('owner-1', 'Title', 'Body', 'create-key'),
    ).rejects.toThrow('IDEMPOTENCY_CONFLICT');
    expect(tx.communityPost.create).not.toHaveBeenCalled();
    expect(tx.communityPost.findFirst).toHaveBeenCalledWith({
      where: { ownerUserId: 'owner-1', creationIdempotencyKey: 'create-key' },
    });
  });

  it('flags a published post after a first owner-scoped report', async () => {
    const tx = {
      communityReport: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null),
        create: jest.fn(),
        count: jest.fn().mockResolvedValue(1),
      },
      communityPost: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'post-1', status: 'PUBLISHED' }),
        update: jest
          .fn()
          .mockResolvedValue({ id: 'post-1', status: 'FLAGGED' }),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    } as unknown as PrismaService;
    const repository = new CommunityRepository(prisma);

    const result = await repository.report(
      'post-1',
      'reporter-1',
      'SPAM',
      'report-key',
      'corr-12345678',
    );
    expect(result).toEqual({ reported: true, replayed: false });
    expect(tx.communityPost.update).toHaveBeenCalled();
  });

  it('persists one moderation decision and invokes the audit callback in the transaction', async () => {
    const appendAudit = jest.fn().mockResolvedValue(undefined);
    const tx = {
      communityDecision: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
      communityPost: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ id: 'post-1', status: 'PENDING_REVIEW' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    } as unknown as PrismaService;
    const repository = new CommunityRepository(prisma);

    const result = await repository.decide(
      'post-1',
      'editor-1',
      'decision-key',
      'PUBLISH',
      'corr-12345678',
      appendAudit,
    );
    expect(result.replayed).toBe(false);
    expect(tx.communityDecision.create).toHaveBeenCalledTimes(1);
    expect(appendAudit).toHaveBeenCalledWith(tx);
  });
});
