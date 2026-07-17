import { AccessError, ACCESS_ERROR_CODES } from './access-error';
import type { ApplicationPrincipal, ResourceOwnership } from './access.models';
import type {
  ApplicationPrincipalResolver,
  RoleAuthorizationPolicy,
  OwnershipAuthorizationPolicy,
} from './access.ports';
import type { ExternalIdentity } from './access.models';

export async function resolveApplicationPrincipalOrThrow(
  resolver: ApplicationPrincipalResolver,
  identity: ExternalIdentity,
) {
  const principal = await resolver.resolve(identity);

  if (!principal) {
    throw new AccessError(ACCESS_ERROR_CODES.APPLICATION_IDENTITY_UNRESOLVED);
  }

  return principal;
}

export function requireApplicationRole(
  principal: ApplicationPrincipal,
  requiredRole: string,
) {
  if (!principal.roles.includes(requiredRole)) {
    throw new AccessError(ACCESS_ERROR_CODES.FORBIDDEN_ROLE);
  }

  return principal;
}

export function requireOwnership(
  principal: ApplicationPrincipal,
  requiredOwnership: ResourceOwnership,
) {
  const hasOwnership = principal.ownerships.some(
    (ownership) =>
      ownership.resourceType === requiredOwnership.resourceType &&
      ownership.resourceId === requiredOwnership.resourceId,
  );

  if (!hasOwnership) {
    throw new AccessError(ACCESS_ERROR_CODES.FORBIDDEN_OWNERSHIP);
  }

  return principal;
}

export class DefaultRoleAuthorizationPolicy implements RoleAuthorizationPolicy {
  requireRole(principal: ApplicationPrincipal, requiredRole: string) {
    return requireApplicationRole(principal, requiredRole);
  }
}

export class DefaultOwnershipAuthorizationPolicy implements OwnershipAuthorizationPolicy {
  requireOwnership(
    principal: ApplicationPrincipal,
    requiredOwnership: ResourceOwnership,
  ) {
    return requireOwnership(principal, requiredOwnership);
  }
}
