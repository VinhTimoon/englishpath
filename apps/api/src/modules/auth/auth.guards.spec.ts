import { RequiredRoleGuard } from './auth.guards';
import { createApplicationPrincipal } from '../access';

describe('RequiredRoleGuard', () => {
  it('accepts any configured privileged role', () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValue(['CONTENT_EDITOR', 'ADMIN', 'SUPER_ADMIN']),
    };
    const principal = createApplicationPrincipal({
      applicationUserId: 'user-001',
      externalIdentity: {
        provider: 'SUPABASE',
        subject: 'external-001',
        issuer: 'https://project.supabase.co/auth/v1',
        audience: 'authenticated',
      },
      roles: ['ADMIN'],
      ownerships: [],
      entitlements: [],
    });
    const context = {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => ({ principal }) }),
    };

    expect(
      new RequiredRoleGuard(reflector as never).canActivate(context as never),
    ).toBe(true);
  });

  it('rejects unknown roles even when the client claims an admin role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['CONTENT_EDITOR', 'ADMIN']),
    };
    const principal = createApplicationPrincipal({
      applicationUserId: 'user-002',
      externalIdentity: {
        provider: 'SUPABASE',
        subject: 'external-002',
        issuer: 'https://project.supabase.co/auth/v1',
        audience: 'authenticated',
      },
      roles: ['FREE_USER'],
      ownerships: [],
      entitlements: [],
    });
    const context = {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => ({ principal }) }),
    };

    expect(() =>
      new RequiredRoleGuard(reflector as never).canActivate(context as never),
    ).toThrow('Required application role is missing.');
  });
});
