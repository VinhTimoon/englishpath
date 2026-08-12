jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { createApplicationPrincipal, createExternalIdentity } from '../access';
import { AuditService } from '../audit/audit.service';
import { AdminRepository } from './admin.repository';
import { AdminService } from './admin.service';
import type { AiOperationsEvidence } from './ai-operations.models';

const usage = {
  aggregateSince: jest.fn<Promise<AiOperationsEvidence>, [Date]>(),
};

const principal = (roles: readonly string[]) =>
  createApplicationPrincipal({
    applicationUserId: 'user-001',
    externalIdentity: createExternalIdentity({
      provider: 'SUPABASE',
      subject: 'external-001',
      issuer: 'https://project.supabase.co/auth/v1',
      audience: 'authenticated',
    }),
    roles,
    ownerships: [],
    entitlements: [],
  });

describe('AdminService', () => {
  beforeEach(() => {
    usage.aggregateSince.mockReset();
  });

  it('denies a learner and records the denied policy decision', async () => {
    const repository = { operationalSummary: jest.fn() };
    const audit = { append: jest.fn().mockResolvedValue(undefined) };
    const service = new AdminService(
      repository as unknown as AdminRepository,
      audit as unknown as AuditService,
      usage,
    );

    await expect(
      service.overview(principal(['FREE_USER']), 'corr-001'),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN_ROLE',
    });
    expect(repository.operationalSummary).not.toHaveBeenCalled();
    expect(audit.append).toHaveBeenCalledWith(
      expect.objectContaining({
        policyResult: 'DENY',
        actorUserId: 'user-001',
      }),
    );
  });

  it('gives editors only the shell capability and no operational counts', async () => {
    const repository = { operationalSummary: jest.fn() };
    const audit = { append: jest.fn().mockResolvedValue(undefined) };
    const service = new AdminService(
      repository as unknown as AdminRepository,
      audit as unknown as AuditService,
      usage,
    );

    await expect(
      service.overview(principal(['CONTENT_EDITOR']), 'corr-002'),
    ).resolves.toEqual({
      role: 'CONTENT_EDITOR',
      capabilities: ['editor_shell'],
    });
    expect(repository.operationalSummary).not.toHaveBeenCalled();
  });

  it('returns safe operational counts only to admins', async () => {
    const repository = {
      operationalSummary: jest
        .fn()
        .mockResolvedValue({ activeUsers: 4, activeRoleAssignments: 3 }),
    };
    const audit = { append: jest.fn().mockResolvedValue(undefined) };
    const service = new AdminService(
      repository as unknown as AdminRepository,
      audit as unknown as AuditService,
      usage,
    );

    await expect(
      service.overview(principal(['ADMIN']), 'corr-003'),
    ).resolves.toEqual({
      role: 'ADMIN',
      capabilities: ['editor_shell', 'operational_summary'],
      operationalSummary: { activeUsers: 4, activeRoleAssignments: 3 },
    });
    expect(audit.append).toHaveBeenCalledWith(
      expect.objectContaining({
        policyResult: 'ALLOW',
        correlationId: 'corr-003',
      }),
    );
  });

  it('returns only the approved aggregate projection and explicit unavailable states', async () => {
    usage.aggregateSince.mockResolvedValue({
      totalRequests: 4,
      outcomes: [
        { key: 'ALLOWED', count: 2 },
        { key: 'DENIED', count: 1 },
        { key: 'PROVIDER_UNAVAILABLE', count: 1 },
      ],
      features: [{ key: 'EXPLANATION', count: 4 }],
      skills: [{ key: 'EXPLANATION', count: 4 }],
      estimatedCostMicros: 0,
    });
    const repository = { operationalSummary: jest.fn() };
    const audit = { append: jest.fn().mockResolvedValue(undefined) };
    const service = new AdminService(
      repository as unknown as AdminRepository,
      audit as unknown as AuditService,
      usage,
    );

    const projection = await service.aiOperations(
      principal(['ADMIN']),
      'corr-ai-001',
    );

    expect(projection).toMatchObject({
      role: 'ADMIN',
      totals: {
        requests: 4,
        allowed: 2,
        denied: 1,
        unavailable: 1,
        quotaDenials: 1,
        estimatedCostMicros: 0,
      },
      replayed: { state: 'unavailable' },
      abuse: { state: 'unavailable' },
    });
    expect(JSON.stringify(projection)).not.toMatch(
      /userId|correlationId|idempotency|fingerprint|feedback|prompt|provider/i,
    );
    expect(usage.aggregateSince).toHaveBeenCalledWith(expect.any(Date));
  });

  it('fails closed when persisted aggregate outcomes are unknown or inconsistent', async () => {
    usage.aggregateSince.mockResolvedValue({
      totalRequests: 1,
      outcomes: [{ key: 'ABUSE', count: 1 }],
      features: [],
      skills: [],
      estimatedCostMicros: 0,
    });
    const audit = { append: jest.fn().mockResolvedValue(undefined) };
    const service = new AdminService(
      {} as AdminRepository,
      audit as unknown as AuditService,
      usage,
    );

    await expect(
      service.aiOperations(principal(['SUPER_ADMIN']), 'corr-ai-002'),
    ).rejects.toThrow('AI operations evidence is malformed.');
    expect(audit.append).not.toHaveBeenCalled();
  });

  it.each([
    ['feature', 'features'],
    ['skill', 'skills'],
  ] as const)(
    'fails closed when the %s aggregate is inconsistent',
    async (_, field) => {
      usage.aggregateSince.mockResolvedValue({
        totalRequests: 4,
        outcomes: [
          { key: 'ALLOWED', count: 2 },
          { key: 'DENIED', count: 1 },
          { key: 'PROVIDER_UNAVAILABLE', count: 1 },
        ],
        features:
          field === 'features'
            ? [{ key: 'EXPLANATION', count: 3 }]
            : [{ key: 'EXPLANATION', count: 4 }],
        skills:
          field === 'skills'
            ? [{ key: 'EXPLANATION', count: 3 }]
            : [{ key: 'EXPLANATION', count: 4 }],
        estimatedCostMicros: 0,
      });
      const service = new AdminService(
        {} as AdminRepository,
        { append: jest.fn() } as unknown as AuditService,
        usage,
      );

      await expect(
        service.aiOperations(principal(['ADMIN']), 'corr-ai-inconsistent'),
      ).rejects.toThrow('AI operations evidence is inconsistent.');
    },
  );

  it('does not expose operations to learners even when usage evidence exists', async () => {
    const audit = { append: jest.fn().mockResolvedValue(undefined) };
    const service = new AdminService(
      {} as AdminRepository,
      audit as unknown as AuditService,
      usage,
    );

    await expect(
      service.aiOperations(principal(['FREE_USER']), 'corr-ai-003'),
    ).rejects.toMatchObject({ code: 'FORBIDDEN_ROLE' });
    expect(usage.aggregateSince).not.toHaveBeenCalled();
  });
});
