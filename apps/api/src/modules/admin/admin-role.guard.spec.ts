jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { createApplicationPrincipal } from '../access';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedRequest } from '../auth/auth-request';
import { AdminRoleGuard } from './admin-role.guard';

describe('AdminRoleGuard', () => {
  const principal = createApplicationPrincipal({
    applicationUserId: 'user-001',
    externalIdentity: {
      provider: 'SUPABASE',
      subject: 'external-001',
      issuer: 'https://project.supabase.co/auth/v1',
      audience: 'authenticated',
    },
    roles: ['FREE_USER'],
    ownerships: [],
    entitlements: [],
  });

  it('audits authenticated role denials before failing closed', async () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValue(['CONTENT_EDITOR', 'ADMIN', 'SUPER_ADMIN']),
    };
    const audit = { append: jest.fn().mockResolvedValue(undefined) };
    const request = {
      principal,
      headers: { 'x-correlation-id': 'corr-role-001' },
    } as unknown as AuthenticatedRequest;
    const context = {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => request }),
    };
    const guard = new AdminRoleGuard(
      reflector as never,
      audit as unknown as AuditService,
    );

    await expect(guard.canActivate(context as never)).rejects.toMatchObject({
      code: 'FORBIDDEN_ROLE',
    });
    expect(audit.append).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'user-001',
        policyResult: 'DENY',
        correlationId: 'corr-role-001',
      }),
    );
  });

  it('reuses one generated correlation ID for malformed-header audit linkage', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']),
    };
    const audit = { append: jest.fn().mockResolvedValue(undefined) };
    const request = {
      principal,
      headers: { 'x-correlation-id': 'bad correlation' },
    } as unknown as AuthenticatedRequest;
    const context = {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => request }),
    };
    const guard = new AdminRoleGuard(
      reflector as never,
      audit as unknown as AuditService,
    );

    await expect(guard.canActivate(context as never)).rejects.toMatchObject({
      code: 'FORBIDDEN_ROLE',
    });
    const calls = audit.append.mock.calls as unknown[][];
    expect(request.correlationId).toBe(
      (calls[0]?.[0] as { correlationId: string }).correlationId,
    );
  });
});
