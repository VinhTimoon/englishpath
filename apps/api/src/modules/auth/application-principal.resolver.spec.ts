import { createExternalIdentity } from '../access';
import { IDENTITY_ERROR_CODES, IdentityError } from '../identity';
import { DatabaseApplicationPrincipalResolver } from './application-principal.resolver';

describe('DatabaseApplicationPrincipalResolver', () => {
  const external = createExternalIdentity({
    provider: 'SUPABASE',
    subject: 'external-user-001',
    issuer: 'https://project.supabase.co/auth/v1',
    audience: 'authenticated',
  });

  it('uses persisted roles rather than JWT claims', async () => {
    const identities = {
      resolveByExternalIdentity: jest.fn().mockResolvedValue({
        id: 'application-user-001',
        provider: 'SUPABASE',
        externalSubject: external.subject,
        status: 'ACTIVE',
        roles: ['SUPER_ADMIN'],
      }),
      create: jest.fn(),
    };
    const roles = {
      listForUser: jest.fn().mockResolvedValue(['FREE_USER']),
      assign: jest.fn(),
    };
    const resolver = new DatabaseApplicationPrincipalResolver(
      identities,
      roles,
    );
    await expect(resolver.resolve(external)).resolves.toMatchObject({
      applicationUserId: 'application-user-001',
      roles: ['FREE_USER'],
    });
  });

  it('fails resolution closed for a missing identity', async () => {
    const resolver = new DatabaseApplicationPrincipalResolver(
      { resolveByExternalIdentity: jest.fn().mockResolvedValue(null) } as never,
      {} as never,
    );
    await expect(resolver.resolve(external)).resolves.toBeNull();
  });

  it('fails resolution closed for an inactive persisted identity', async () => {
    const resolver = new DatabaseApplicationPrincipalResolver(
      {
        resolveByExternalIdentity: jest
          .fn()
          .mockRejectedValue(
            new IdentityError(IDENTITY_ERROR_CODES.INACTIVE_IDENTITY),
          ),
      } as never,
      {} as never,
    );
    await expect(resolver.resolve(external)).resolves.toBeNull();
  });

  it('assigns FREE_USER once when provisioning a first identity', async () => {
    const created = {
      id: 'application-user-001',
      provider: 'SUPABASE',
      externalSubject: external.subject,
      status: 'ACTIVE',
      roles: [],
    };
    const identities = {
      resolveByExternalIdentity: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValue(created),
      create: jest.fn().mockResolvedValue(created),
    };
    const roles = {
      listForUser: jest.fn().mockResolvedValue(['FREE_USER']),
      assign: jest.fn().mockResolvedValue(undefined),
    };
    const resolver = new DatabaseApplicationPrincipalResolver(
      identities,
      roles,
    );
    await resolver.provision({
      ...external,
      verifiedEmail: 'learner@example.com',
    });
    expect(identities.create).toHaveBeenCalledTimes(1);
    expect(roles.assign).toHaveBeenCalledWith({
      userId: created.id,
      role: 'FREE_USER',
    });
  });

  it('recovers idempotently when concurrent provisioning wins the create race', async () => {
    const created = {
      id: 'application-user-001',
      provider: 'SUPABASE',
      externalSubject: external.subject,
      status: 'ACTIVE',
      roles: [],
    };
    const identities = {
      resolveByExternalIdentity: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValue(created),
      create: jest
        .fn()
        .mockRejectedValue(
          new IdentityError(IDENTITY_ERROR_CODES.DUPLICATE_IDENTITY),
        ),
    };
    const roles = {
      listForUser: jest.fn().mockResolvedValue(['FREE_USER']),
      assign: jest.fn().mockResolvedValue(undefined),
    };
    const resolver = new DatabaseApplicationPrincipalResolver(
      identities,
      roles,
    );
    await expect(
      resolver.provision({
        ...external,
        verifiedEmail: 'learner@example.com',
      }),
    ).resolves.toMatchObject({ roles: ['FREE_USER'] });
    expect(roles.assign).toHaveBeenCalledTimes(1);
  });
});
