jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { AdminAuthenticationGuard } from './admin-authentication.guard';
import { AuthenticationGuard } from '../auth/auth.guards';
import { AuditService } from '../audit/audit.service';

describe('AdminAuthenticationGuard', () => {
  it('audits authentication denial without weakening fail-closed behavior', async () => {
    const authentication = {
      canActivate: jest.fn().mockRejectedValue(new Error('invalid token')),
    };
    const audit = { append: jest.fn().mockResolvedValue(undefined) };
    const request = { headers: { 'x-correlation-id': 'corr-auth-001' } };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    };
    const guard = new AdminAuthenticationGuard(
      authentication as unknown as AuthenticationGuard,
      audit as unknown as AuditService,
    );

    await expect(guard.canActivate(context as never)).rejects.toThrow(
      'invalid token',
    );
    expect(audit.append).toHaveBeenCalledWith({
      action: 'admin.overview.read',
      target: 'admin.overview',
      policyResult: 'DENY',
      correlationId: 'corr-auth-001',
      attributes: { capability: 'authentication', outcome: 'denied' },
    });
  });

  it('does not replace an authentication denial when audit storage fails', async () => {
    const authentication = {
      canActivate: jest.fn().mockRejectedValue(new Error('missing token')),
    };
    const audit = { append: jest.fn().mockRejectedValue(new Error('db down')) };
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
    };
    const guard = new AdminAuthenticationGuard(
      authentication as unknown as AuthenticationGuard,
      audit as unknown as AuditService,
    );

    await expect(guard.canActivate(context as never)).rejects.toThrow(
      'missing token',
    );
  });
});
