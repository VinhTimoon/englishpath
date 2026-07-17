import { Inject, Injectable } from '@nestjs/common';
import {
  createApplicationPrincipal,
  type ApplicationPrincipalResolver,
  type ExternalIdentity,
} from '../access';
import type {
  ApplicationIdentity,
  ApplicationIdentityRepository,
  ApplicationRoleRepository,
} from '../identity';
import { IDENTITY_ERROR_CODES, IdentityError } from '../identity';
import {
  APPLICATION_IDENTITY_REPOSITORY,
  APPLICATION_ROLE_REPOSITORY,
} from './auth.tokens';

@Injectable()
export class DatabaseApplicationPrincipalResolver implements ApplicationPrincipalResolver {
  constructor(
    @Inject(APPLICATION_IDENTITY_REPOSITORY)
    private readonly identities: ApplicationIdentityRepository,
    @Inject(APPLICATION_ROLE_REPOSITORY)
    private readonly roles: ApplicationRoleRepository,
  ) {}

  async resolve(external: ExternalIdentity) {
    if (external.provider !== 'SUPABASE') return null;
    try {
      const identity = await this.identities.resolveByExternalIdentity(
        'SUPABASE',
        external.subject,
      );
      if (!identity || identity.status !== 'ACTIVE') return null;
      const roles = await this.roles.listForUser(identity.id);
      return createApplicationPrincipal({
        applicationUserId: identity.id,
        externalIdentity: external,
        roles,
        ownerships: [{ resourceType: 'profile', resourceId: identity.id }],
        entitlements: [],
      });
    } catch (error: unknown) {
      if (
        error instanceof IdentityError &&
        [
          IDENTITY_ERROR_CODES.IDENTITY_NOT_FOUND,
          IDENTITY_ERROR_CODES.INACTIVE_IDENTITY,
        ].includes(error.code as never)
      ) {
        return null;
      }
      throw error;
    }
  }

  async provision(external: ExternalIdentity) {
    if (external.provider !== 'SUPABASE' || !external.verifiedEmail)
      return null;
    const existing = await this.resolve(external);
    if (existing) return existing;
    let identity: ApplicationIdentity;
    try {
      identity = await this.identities.create({
        email: external.verifiedEmail,
        provider: 'SUPABASE',
        externalSubject: external.subject,
      });
    } catch (error: unknown) {
      if (
        !(error instanceof IdentityError) ||
        error.code !== IDENTITY_ERROR_CODES.DUPLICATE_IDENTITY
      ) {
        throw error;
      }
      const racedIdentity = await this.identities.resolveByExternalIdentity(
        'SUPABASE',
        external.subject,
      );
      if (!racedIdentity) throw error;
      identity = racedIdentity;
    }
    await this.roles.assign({ userId: identity.id, role: 'FREE_USER' });
    return this.resolve(external);
  }
}
