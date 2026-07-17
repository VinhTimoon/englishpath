import type {
  ApplicationIdentity,
  IdentityProvider,
  ProfileInput,
  RoleCode,
  UserProfile,
} from './identity.models';

export interface ApplicationIdentityRepository {
  resolveByExternalIdentity(
    provider: IdentityProvider,
    externalSubject: string,
  ): Promise<ApplicationIdentity | null>;
  create(input: {
    email: string;
    provider: IdentityProvider;
    externalSubject: string;
  }): Promise<ApplicationIdentity>;
}

export interface OwnedProfileRepository {
  findOwned(
    ownerUserId: string,
    targetUserId: string,
  ): Promise<UserProfile | null>;
  upsertOwned(
    ownerUserId: string,
    targetUserId: string,
    profile: ProfileInput,
  ): Promise<UserProfile>;
}

export interface ApplicationRoleRepository {
  listForUser(userId: string): Promise<readonly RoleCode[]>;
  assign(input: {
    userId: string;
    role: RoleCode;
    assignedByUserId?: string;
    reason?: string;
  }): Promise<void>;
}
