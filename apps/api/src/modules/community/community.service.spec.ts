import { ConflictException, NotFoundException } from '@nestjs/common';
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));
jest.mock('./community.repository', () => ({ CommunityRepository: class {} }));
import { CommunityService } from './community.service';
import { Decision, ReportReason } from './dto/community.dto';

describe('CommunityService', () => {
  const principal = { applicationUserId: 'owner-1' } as never;
  const repo = {
    create: jest.fn(),
    published: jest.fn(),
    countPublished: jest.fn(),
    report: jest.fn(),
    queue: jest.fn(),
    countQueue: jest.fn(),
    decide: jest.fn(),
  };
  const audit = { appendWithTransaction: jest.fn() };
  let service: CommunityService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CommunityService(repo as never, audit as never);
  });

  it('trims owner-scoped post input and preserves pending state', async () => {
    repo.create.mockResolvedValue({
      replayed: false,
      post: {
        id: 'post-1',
        title: 'Title',
        body: 'Body',
        status: 'PENDING_REVIEW',
        createdAt: new Date('2026-08-12T00:00:00.000Z'),
      },
    });
    const result = await service.create(
      principal,
      { title: ' Title ', body: ' Body ' },
      'create-key',
    );
    expect(repo.create.mock.calls).toContainEqual([
      'owner-1',
      'Title',
      'Body',
      'create-key',
    ]);
    expect(result.data.status).toBe('PENDING_REVIEW');
  });

  it('does not turn an unpublished report target into a successful report', async () => {
    repo.report.mockResolvedValue(null);
    await expect(
      service.report(
        principal,
        'private-post',
        { reason: ReportReason.SPAM },
        'report-key',
        'corr-12345678',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps idempotency conflicts to sanitized conflicts', async () => {
    repo.create.mockRejectedValue(new Error('IDEMPOTENCY_CONFLICT'));
    await expect(
      service.create(principal, { title: 'Title', body: 'Body' }, 'create-key'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('adds one audit callback to a new moderation decision and none to a replay', async () => {
    repo.decide.mockImplementation(async (...args: unknown[]) => {
      const callback = args[5];
      if (typeof callback === 'function')
        await (callback as (client: never) => Promise<unknown>)({} as never);
      return { replayed: false, post: { id: 'post-1', status: 'PUBLISHED' } };
    });
    await service.decide(
      principal,
      'post-1',
      { decision: Decision.PUBLISH },
      'decision-key',
      'corr-12345678',
    );
    expect(audit.appendWithTransaction).toHaveBeenCalledTimes(1);
    repo.decide.mockResolvedValue({
      replayed: true,
      post: { id: 'post-1', status: 'PUBLISHED' },
    });
    await service.decide(
      principal,
      'post-1',
      { decision: Decision.PUBLISH },
      'decision-key',
      'corr-12345678',
    );
    expect(audit.appendWithTransaction).toHaveBeenCalledTimes(1);
  });
});
