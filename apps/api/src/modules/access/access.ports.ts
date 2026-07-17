import type {
  ApplicationPrincipal,
  ExternalIdentity,
  ResourceOwnership,
} from './access.models';

export interface BearerCredentialExtractor<TSource> {
  extract(source: TSource): string;
}

export interface ExternalIdentityVerifier {
  verify(token: string): Promise<ExternalIdentity>;
}

export interface ApplicationPrincipalResolver {
  resolve(identity: ExternalIdentity): Promise<ApplicationPrincipal | null>;
}

export interface RoleAuthorizationPolicy {
  requireRole(
    principal: ApplicationPrincipal,
    requiredRole: string,
  ): ApplicationPrincipal;
}

export interface OwnershipAuthorizationPolicy {
  requireOwnership(
    principal: ApplicationPrincipal,
    requiredOwnership: ResourceOwnership,
  ): ApplicationPrincipal;
}
