import { IDENTITY_ERROR_CODES, IdentityError } from './identity.error';
import {
  assertOwnership,
  createApplicationIdentity,
  normalizeProfileInput,
  normalizeProfilePatch,
  requireIdentityId,
  requireProvider,
  requireRoleCode,
  type ApplicationIdentity,
  type IdentityProvider,
  type ProfileInput,
  type RoleCode,
  type UserProfile,
} from './identity.models';
import type {
  ApplicationIdentityRepository,
  ApplicationRoleRepository,
  OwnedProfileRepository,
} from './identity.ports';

type RoleAssignmentRecord = { role: { code: string } };
type UserRecord = {
  id: string;
  authProvider: string;
  externalSubject: string | null;
  status: string;
  roleAssignments?: RoleAssignmentRecord[];
};
type ProfileRecord = {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  locale: string;
  timezone: string;
};

export interface IdentityPrismaClient {
  user: {
    findUnique(args: unknown): Promise<UserRecord | null>;
    create(args: unknown): Promise<UserRecord>;
  };
  userProfile: {
    findUnique(args: unknown): Promise<ProfileRecord | null>;
    upsert(args: unknown): Promise<ProfileRecord>;
  };
  role: {
    findUnique(args: unknown): Promise<{ id: string; code: string } | null>;
  };
  userRole: {
    upsert(args: unknown): Promise<unknown>;
  };
  $transaction<T>(
    operation: (client: IdentityPrismaClient) => Promise<T>,
  ): Promise<T>;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

async function sanitizedPersistence<T>(
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error: unknown) {
    if (error instanceof IdentityError) throw error;
    throw new IdentityError(IDENTITY_ERROR_CODES.PERSISTENCE_FAILURE);
  }
}

function requireEmail(value: unknown): string {
  if (
    typeof value !== 'string' ||
    value.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  ) {
    throw new IdentityError(IDENTITY_ERROR_CODES.INVALID_IDENTITY);
  }
  return value.toLowerCase();
}

function toIdentity(record: UserRecord): ApplicationIdentity {
  if (!record.externalSubject) {
    throw new IdentityError(IDENTITY_ERROR_CODES.IDENTITY_NOT_FOUND);
  }
  return createApplicationIdentity({
    id: record.id,
    provider: record.authProvider,
    externalSubject: record.externalSubject,
    status: record.status,
    roles: (record.roleAssignments ?? []).map(({ role }) => role.code),
  });
}

function requireActive(record: UserRecord): UserRecord {
  if (record.status !== 'ACTIVE') {
    throw new IdentityError(IDENTITY_ERROR_CODES.INACTIVE_IDENTITY);
  }
  return record;
}

function toProfile(record: ProfileRecord): UserProfile {
  return Object.freeze({
    userId: record.userId,
    displayName: record.displayName,
    avatarUrl: record.avatarUrl,
    locale: record.locale,
    timezone: record.timezone,
  });
}

export class PrismaApplicationIdentityRepository implements ApplicationIdentityRepository {
  constructor(private readonly prisma: IdentityPrismaClient) {}

  async resolveByExternalIdentity(
    provider: IdentityProvider,
    externalSubject: string,
  ): Promise<ApplicationIdentity | null> {
    const safeProvider = requireProvider(provider);
    const safeSubject = requireIdentityId(externalSubject);
    return sanitizedPersistence(async () => {
      const record = await this.prisma.user.findUnique({
        where: {
          authProvider_externalSubject: {
            authProvider: safeProvider,
            externalSubject: safeSubject,
          },
        },
        include: { roleAssignments: { include: { role: true } } },
      });
      if (!record) return null;
      return toIdentity(requireActive(record));
    });
  }

  async create(input: {
    email: string;
    provider: IdentityProvider;
    externalSubject: string;
  }): Promise<ApplicationIdentity> {
    const email = requireEmail(input.email);
    const provider = requireProvider(input.provider);
    const externalSubject = requireIdentityId(input.externalSubject);
    try {
      const record = await this.prisma.user.create({
        data: { email, authProvider: provider, externalSubject },
        include: { roleAssignments: { include: { role: true } } },
      });
      return toIdentity(record);
    } catch (error: unknown) {
      if (isUniqueConstraintError(error)) {
        throw new IdentityError(IDENTITY_ERROR_CODES.DUPLICATE_IDENTITY);
      }
      throw new IdentityError(IDENTITY_ERROR_CODES.PERSISTENCE_FAILURE);
    }
  }
}

export class PrismaOwnedProfileRepository implements OwnedProfileRepository {
  constructor(private readonly prisma: IdentityPrismaClient) {}

  async findOwned(
    ownerUserId: string,
    targetUserId: string,
  ): Promise<UserProfile | null> {
    const userId = assertOwnership(ownerUserId, targetUserId);
    return sanitizedPersistence(async () => {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new IdentityError(IDENTITY_ERROR_CODES.IDENTITY_NOT_FOUND);
      }
      requireActive(user);
      const record = await this.prisma.userProfile.findUnique({
        where: { userId },
      });
      return record ? toProfile(record) : null;
    });
  }

  async upsertOwned(
    ownerUserId: string,
    targetUserId: string,
    input: ProfileInput,
  ): Promise<UserProfile> {
    const userId = assertOwnership(ownerUserId, targetUserId);
    const createProfile = normalizeProfileInput(input);
    const updateProfile = normalizeProfilePatch(input);
    return sanitizedPersistence(() =>
      this.prisma.$transaction(async (transaction) => {
        const user = await transaction.user.findUnique({
          where: { id: userId },
        });
        if (!user) {
          throw new IdentityError(IDENTITY_ERROR_CODES.IDENTITY_NOT_FOUND);
        }
        requireActive(user);
        const record = await transaction.userProfile.upsert({
          where: { userId },
          create: { userId, ...createProfile },
          update: updateProfile,
        });
        return toProfile(record);
      }),
    );
  }
}

export class PrismaApplicationRoleRepository implements ApplicationRoleRepository {
  constructor(private readonly prisma: IdentityPrismaClient) {}

  async listForUser(userId: string): Promise<readonly RoleCode[]> {
    const id = requireIdentityId(userId);
    return sanitizedPersistence(async () => {
      const record = await this.prisma.user.findUnique({
        where: { id },
        include: { roleAssignments: { include: { role: true } } },
      });
      if (!record) {
        throw new IdentityError(IDENTITY_ERROR_CODES.IDENTITY_NOT_FOUND);
      }
      const roles = requireActive(record).roleAssignments?.map(({ role }) =>
        requireRoleCode(role.code),
      );
      return Object.freeze(roles ?? []);
    });
  }

  async assign(input: {
    userId: string;
    role: RoleCode;
    assignedByUserId?: string;
    reason?: string;
  }): Promise<void> {
    const userId = requireIdentityId(input.userId);
    const roleCode = requireRoleCode(input.role);
    const assignedByUserId = input.assignedByUserId
      ? requireIdentityId(input.assignedByUserId)
      : undefined;
    if (
      input.reason !== undefined &&
      (typeof input.reason !== 'string' || input.reason.length > 200)
    ) {
      throw new IdentityError(IDENTITY_ERROR_CODES.INVALID_ROLE);
    }

    await sanitizedPersistence(() =>
      this.prisma.$transaction(async (transaction) => {
        const user = await transaction.user.findUnique({
          where: { id: userId },
        });
        if (!user) {
          throw new IdentityError(IDENTITY_ERROR_CODES.IDENTITY_NOT_FOUND);
        }
        requireActive(user);
        const role = await transaction.role.findUnique({
          where: { code: roleCode },
        });
        if (!role) {
          throw new IdentityError(IDENTITY_ERROR_CODES.INVALID_ROLE);
        }
        await transaction.userRole.upsert({
          where: { userId_roleId: { userId, roleId: role.id } },
          create: {
            userId,
            roleId: role.id,
            assignedByUserId,
            assignmentReason: input.reason,
          },
          update: {},
        });
      }),
    );
  }
}
