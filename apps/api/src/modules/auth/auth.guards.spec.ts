import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createApplicationPrincipal, createExternalIdentity } from '../access';
import { OwnerGuard, RequiredRoleGuard } from './auth.guards';

function context(
  principal: ReturnType<typeof createApplicationPrincipal>,
  userId?: string,
) {
  return {
    getHandler: () => Object,
    getClass: () => Object,
    switchToHttp: () => ({
      getRequest: () => ({ principal, params: { userId } }),
    }),
  } as unknown as ExecutionContext;
}

describe('authorization guards', () => {
  const principal = createApplicationPrincipal({
    applicationUserId: 'application-user-001',
    externalIdentity: createExternalIdentity({
      provider: 'SUPABASE',
      subject: 'external-user-001',
      issuer: 'issuer',
      audience: 'audience',
    }),
    roles: ['FREE_USER'],
    ownerships: [
      { resourceType: 'profile', resourceId: 'application-user-001' },
    ],
    entitlements: [],
  });

  it('denies a missing backend role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue('ADMIN'),
    } as unknown as Reflector;
    expect(() =>
      new RequiredRoleGuard(reflector).canActivate(context(principal)),
    ).toThrow('Required application role is missing.');
  });

  it('denies ownership of another user profile', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue('profile'),
    } as unknown as Reflector;
    expect(() =>
      new OwnerGuard(reflector).canActivate(
        context(principal, 'application-user-002'),
      ),
    ).toThrow('Required resource ownership is missing.');
  });
});
