import { IDENTITY_ERROR_CODES, IdentityError } from './identity.error';
import {
  PrismaApplicationIdentityRepository,
  PrismaApplicationRoleRepository,
  PrismaOwnedProfileRepository,
  type IdentityPrismaClient,
} from './prisma-identity.repositories';

function activeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-0001',
    authProvider: 'SUPABASE',
    externalSubject: 'subject-0001',
    status: 'ACTIVE',
    roleAssignments: [{ role: { code: 'FREE_USER' } }],
    ...overrides,
  };
}

function createClient() {
  const client = {
    user: { findUnique: jest.fn(), create: jest.fn() },
    userProfile: { findUnique: jest.fn(), upsert: jest.fn() },
    role: { findUnique: jest.fn() },
    userRole: { upsert: jest.fn() },
    $transaction: jest.fn(),
  };
  client.$transaction.mockImplementation(
    async (
      operation: (transaction: IdentityPrismaClient) => Promise<unknown>,
    ) => operation(client),
  );
  return client;
}

describe('Prisma identity repositories', () => {
  it('resolves provider subject with application roles only', async () => {
    const client = createClient();
    client.user.findUnique.mockResolvedValue(activeUser());
    const repository = new PrismaApplicationIdentityRepository(client);

    await expect(
      repository.resolveByExternalIdentity('SUPABASE', 'subject-0001'),
    ).resolves.toEqual({
      id: 'user-0001',
      provider: 'SUPABASE',
      externalSubject: 'subject-0001',
      status: 'ACTIVE',
      roles: ['FREE_USER'],
    });
    expect(client.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          authProvider_externalSubject: {
            authProvider: 'SUPABASE',
            externalSubject: 'subject-0001',
          },
        },
      }),
    );
  });

  it('returns null for missing identity and fails closed for inactive identity', async () => {
    const client = createClient();
    const repository = new PrismaApplicationIdentityRepository(client);
    client.user.findUnique.mockResolvedValueOnce(null);
    await expect(
      repository.resolveByExternalIdentity('SUPABASE', 'subject-0001'),
    ).resolves.toBeNull();

    client.user.findUnique.mockResolvedValueOnce(
      activeUser({ status: 'SUSPENDED' }),
    );
    await expect(
      repository.resolveByExternalIdentity('SUPABASE', 'subject-0001'),
    ).rejects.toMatchObject({ code: IDENTITY_ERROR_CODES.INACTIVE_IDENTITY });
  });

  it('maps duplicate provider identity to a sanitized error', async () => {
    const client = createClient();
    const secret = 'person@example.com';
    client.user.create.mockRejectedValue({ code: 'P2002', meta: { secret } });
    const repository = new PrismaApplicationIdentityRepository(client);

    try {
      await repository.create({
        email: secret,
        provider: 'SUPABASE',
        externalSubject: 'subject-0001',
      });
      fail('Expected duplicate identity to fail.');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(IdentityError);
      expect(error).toMatchObject({
        code: IDENTITY_ERROR_CODES.DUPLICATE_IDENTITY,
      });
      expect(String(error)).not.toContain(secret);
    }
  });

  it('blocks cross-user profile access before calling Prisma', async () => {
    const client = createClient();
    const repository = new PrismaOwnedProfileRepository(client);

    await expect(
      repository.findOwned('user-0001', 'user-0002'),
    ).rejects.toMatchObject({
      code: IDENTITY_ERROR_CODES.FORBIDDEN_OWNERSHIP,
    });
    expect(client.userProfile.findUnique).not.toHaveBeenCalled();
    expect(client.userProfile.upsert).not.toHaveBeenCalled();
  });

  it('upserts only the owner profile with normalized fields', async () => {
    const client = createClient();
    client.user.findUnique.mockResolvedValue(activeUser());
    client.userProfile.upsert.mockResolvedValue({
      userId: 'user-0001',
      displayName: 'Learner',
      avatarUrl: null,
      locale: 'vi-VN',
      timezone: 'Asia/Ho_Chi_Minh',
    });
    const repository = new PrismaOwnedProfileRepository(client);

    await expect(
      repository.upsertOwned('user-0001', 'user-0001', {
        displayName: 'Learner',
      }),
    ).resolves.toEqual(
      expect.objectContaining({ userId: 'user-0001', displayName: 'Learner' }),
    );
    expect(client.userProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-0001' },
        update: { displayName: 'Learner' },
      }),
    );
    expect(client.$transaction).toHaveBeenCalledTimes(1);
  });

  it('blocks inactive profile owners and sanitizes persistence failures', async () => {
    const client = createClient();
    const profiles = new PrismaOwnedProfileRepository(client);
    client.user.findUnique.mockResolvedValueOnce(
      activeUser({ status: 'SUSPENDED' }),
    );
    await expect(
      profiles.upsertOwned('user-0001', 'user-0001', {}),
    ).rejects.toMatchObject({ code: IDENTITY_ERROR_CODES.INACTIVE_IDENTITY });
    expect(client.userProfile.upsert).not.toHaveBeenCalled();

    const secret = 'database-secret';
    client.user.findUnique.mockRejectedValueOnce(new Error(secret));
    try {
      await profiles.findOwned('user-0001', 'user-0001');
      fail('Expected persistence failure.');
    } catch (error: unknown) {
      expect(error).toMatchObject({
        code: IDENTITY_ERROR_CODES.PERSISTENCE_FAILURE,
      });
      expect(String(error)).not.toContain(secret);
    }
  });

  it('assigns roles transactionally and idempotently', async () => {
    const client = createClient();
    client.user.findUnique.mockResolvedValue(activeUser());
    client.role.findUnique.mockResolvedValue({
      id: 'role-admin',
      code: 'ADMIN',
    });
    const repository = new PrismaApplicationRoleRepository(client);

    await Promise.all([
      repository.assign({
        userId: 'user-0001',
        role: 'ADMIN',
        assignedByUserId: 'admin-0001',
        reason: 'Approved access',
      }),
      repository.assign({ userId: 'user-0001', role: 'ADMIN' }),
    ]);

    expect(client.$transaction).toHaveBeenCalledTimes(2);
    expect(client.userRole.upsert).toHaveBeenCalledTimes(2);
    expect(client.userRole.upsert).toHaveBeenCalledWith({
      where: {
        userId_roleId: { userId: 'user-0001', roleId: 'role-admin' },
      },
      create: {
        userId: 'user-0001',
        roleId: 'role-admin',
        assignedByUserId: 'admin-0001',
        assignmentReason: 'Approved access',
      },
      update: {},
    });
  });

  it('rejects missing or inactive users before role mutation', async () => {
    const client = createClient();
    const repository = new PrismaApplicationRoleRepository(client);
    client.user.findUnique.mockResolvedValueOnce(null);
    await expect(
      repository.assign({ userId: 'user-0001', role: 'FREE_USER' }),
    ).rejects.toMatchObject({ code: IDENTITY_ERROR_CODES.IDENTITY_NOT_FOUND });

    client.user.findUnique.mockResolvedValueOnce(
      activeUser({ status: 'RETAINED' }),
    );
    await expect(
      repository.assign({ userId: 'user-0001', role: 'FREE_USER' }),
    ).rejects.toMatchObject({ code: IDENTITY_ERROR_CODES.INACTIVE_IDENTITY });
    expect(client.userRole.upsert).not.toHaveBeenCalled();
  });
});
