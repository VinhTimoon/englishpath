type NonEmptyString = string;

export type ExternalIdentity = Readonly<{
  provider: NonEmptyString;
  subject: NonEmptyString;
  issuer: NonEmptyString;
  audience: NonEmptyString;
  verifiedEmail?: NonEmptyString;
}>;

export type ResourceOwnership = Readonly<{
  resourceType: NonEmptyString;
  resourceId: NonEmptyString;
}>;

export type ApplicationPrincipal = Readonly<{
  applicationUserId: NonEmptyString;
  externalIdentity: ExternalIdentity;
  roles: readonly NonEmptyString[];
  ownerships: readonly ResourceOwnership[];
  entitlements: readonly NonEmptyString[];
}>;

type ExternalIdentityInput = ExternalIdentity & Record<string, unknown>;
type ApplicationPrincipalInput = ApplicationPrincipal & Record<string, unknown>;

function requireNonEmptyString(value: string, fieldName: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
  return normalized;
}

export function createExternalIdentity(
  input: ExternalIdentityInput,
): ExternalIdentity {
  const verifiedEmail = input.verifiedEmail?.trim();

  return Object.freeze({
    provider: requireNonEmptyString(input.provider, 'provider'),
    subject: requireNonEmptyString(input.subject, 'subject'),
    issuer: requireNonEmptyString(input.issuer, 'issuer'),
    audience: requireNonEmptyString(input.audience, 'audience'),
    ...(verifiedEmail ? { verifiedEmail } : {}),
  });
}

export function createResourceOwnership(
  input: ResourceOwnership,
): ResourceOwnership {
  return Object.freeze({
    resourceType: requireNonEmptyString(input.resourceType, 'resourceType'),
    resourceId: requireNonEmptyString(input.resourceId, 'resourceId'),
  });
}

export function createApplicationPrincipal(
  input: ApplicationPrincipalInput,
): ApplicationPrincipal {
  return Object.freeze({
    applicationUserId: requireNonEmptyString(
      input.applicationUserId,
      'applicationUserId',
    ),
    externalIdentity: createExternalIdentity(input.externalIdentity),
    roles: Object.freeze(
      input.roles.map((role) => requireNonEmptyString(role, 'role')),
    ),
    ownerships: Object.freeze(
      input.ownerships.map((ownership) => createResourceOwnership(ownership)),
    ),
    entitlements: Object.freeze(
      input.entitlements.map((entitlement) =>
        requireNonEmptyString(entitlement, 'entitlement'),
      ),
    ),
  });
}
