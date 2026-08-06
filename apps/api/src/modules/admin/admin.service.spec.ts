jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { createApplicationPrincipal, createExternalIdentity } from '../access';
import { AuditService } from '../audit/audit.service';
import { AdminRepository } from './admin.repository';
import { AdminService } from './admin.service';

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
  it('denies a learner and records the denied policy decision', async () => {
    const repository = { operationalSummary: jest.fn() };
    const audit = { append: jest.fn().mockResolvedValue(undefined) };
    const service = new AdminService(
      repository as unknown as AdminRepository,
      audit as unknown as AuditService,
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
});
