import { AccessError, ACCESS_ERROR_CODES } from './access-error';
import {
  DefaultOwnershipAuthorizationPolicy,
  DefaultRoleAuthorizationPolicy,
  requireOwnership,
  resolveApplicationPrincipalOrThrow,
} from './access-policy';
import {
  createApplicationPrincipal,
  createExternalIdentity,
} from './access.models';

describe('access policy contracts', () => {
  const externalIdentity = createExternalIdentity({
    provider: 'supabase',
    subject: 'subject-123',
    issuer: 'https://project.supabase.co/auth/v1',
    audience: 'authenticated',
    verifiedEmail: 'learner@example.com',
  });

  const principal = createApplicationPrincipal({
    applicationUserId: 'app-user-123',
    externalIdentity,
    roles: ['learner'],
    ownerships: [
      {
        resourceType: 'profile',
        resourceId: 'profile-123',
      },
    ],
    entitlements: ['free'],
  });

  it('requires application data before a principal exists', async () => {
    await expect(
      resolveApplicationPrincipalOrThrow(
        {
          resolve: () => Promise.resolve(null),
        },
        externalIdentity,
      ),
    ).rejects.toMatchObject({
      code: ACCESS_ERROR_CODES.APPLICATION_IDENTITY_UNRESOLVED,
      message: 'Application identity could not be resolved.',
    });
  });

  it('returns the resolved application principal when backend data exists', async () => {
    await expect(
      resolveApplicationPrincipalOrThrow(
        {
          resolve: () => Promise.resolve(principal),
        },
        externalIdentity,
      ),
    ).resolves.toBe(principal);
  });

  it('allows and rejects role checks only from application principal data', () => {
    const policy = new DefaultRoleAuthorizationPolicy();

    expect(policy.requireRole(principal, 'learner')).toBe(principal);
    expect(() => policy.requireRole(principal, 'admin')).toThrow(AccessError);
    expect(() => policy.requireRole(principal, 'admin')).toThrow(
      'Required application role is missing.',
    );
  });

  it('allows and rejects ownership checks only from application principal data', () => {
    const policy = new DefaultOwnershipAuthorizationPolicy();

    expect(
      requireOwnership(principal, {
        resourceType: 'profile',
        resourceId: 'profile-123',
      }),
    ).toBe(principal);
    expect(() =>
      policy.requireOwnership(principal, {
        resourceType: 'profile',
        resourceId: 'profile-999',
      }),
    ).toThrow(AccessError);
    expect(() =>
      policy.requireOwnership(principal, {
        resourceType: 'profile',
        resourceId: 'profile-999',
      }),
    ).toThrow('Required resource ownership is missing.');
  });

  it('keeps authorization state separate from external identity claims', () => {
    expect(externalIdentity).toEqual({
      provider: 'supabase',
      subject: 'subject-123',
      issuer: 'https://project.supabase.co/auth/v1',
      audience: 'authenticated',
      verifiedEmail: 'learner@example.com',
    });
    expect('roles' in externalIdentity).toBe(false);
    expect('ownerships' in externalIdentity).toBe(false);
    expect('entitlements' in externalIdentity).toBe(false);
  });
});
