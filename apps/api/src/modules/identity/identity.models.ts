import { IDENTITY_ERROR_CODES, IdentityError } from './identity.error';

export const IDENTITY_PROVIDERS = ['SUPABASE'] as const;
export const USER_STATUSES = ['ACTIVE', 'SUSPENDED', 'RETAINED'] as const;
export const ROLE_CODES = [
  'FREE_USER',
  'PREMIUM_USER',
  'CONTENT_EDITOR',
  'ADMIN',
  'SUPER_ADMIN',
] as const;

export type IdentityProvider = (typeof IDENTITY_PROVIDERS)[number];
export type UserStatus = (typeof USER_STATUSES)[number];
export type RoleCode = (typeof ROLE_CODES)[number];

export type ApplicationIdentity = Readonly<{
  id: string;
  provider: IdentityProvider;
  externalSubject: string;
  status: UserStatus;
  roles: readonly RoleCode[];
}>;

export type UserProfile = Readonly<{
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  locale: string;
  timezone: string;
}>;

export type ProfileInput = Readonly<{
  displayName?: unknown;
  avatarUrl?: unknown;
  locale?: unknown;
  timezone?: unknown;
}>;

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,191}$/;
const LOCALE_PATTERN = /^[a-z]{2}(?:-[A-Z]{2})?$/;
const TIMEZONE_PATTERN = /^[A-Za-z_]+(?:\/[A-Za-z_+-]+)+$/;

export function requireIdentityId(value: unknown): string {
  if (typeof value !== 'string' || !ID_PATTERN.test(value)) {
    throw new IdentityError(IDENTITY_ERROR_CODES.INVALID_IDENTITY);
  }
  return value;
}

export function requireProvider(value: unknown): IdentityProvider {
  if (!IDENTITY_PROVIDERS.includes(value as never)) {
    throw new IdentityError(IDENTITY_ERROR_CODES.INVALID_IDENTITY);
  }
  return value as IdentityProvider;
}

export function requireRoleCode(value: unknown): RoleCode {
  if (!ROLE_CODES.includes(value as never)) {
    throw new IdentityError(IDENTITY_ERROR_CODES.INVALID_ROLE);
  }
  return value as RoleCode;
}

export function createApplicationIdentity(input: {
  id: unknown;
  provider: unknown;
  externalSubject: unknown;
  status: unknown;
  roles?: readonly unknown[];
}): ApplicationIdentity {
  if (!USER_STATUSES.includes(input.status as never)) {
    throw new IdentityError(IDENTITY_ERROR_CODES.INVALID_IDENTITY);
  }
  const roles = Object.freeze((input.roles ?? []).map(requireRoleCode));
  return Object.freeze({
    id: requireIdentityId(input.id),
    provider: requireProvider(input.provider),
    externalSubject: requireIdentityId(input.externalSubject),
    status: input.status as UserStatus,
    roles,
  });
}

function optionalBoundedString(
  value: unknown,
  maxLength: number,
): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > maxLength) {
    throw new IdentityError(IDENTITY_ERROR_CODES.INVALID_PROFILE);
  }
  return value;
}

export function normalizeProfileInput(input: ProfileInput) {
  const displayName = optionalBoundedString(input.displayName, 100);
  const avatarUrl = optionalBoundedString(input.avatarUrl, 2048);
  const locale = input.locale ?? 'vi-VN';
  const timezone = input.timezone ?? 'Asia/Ho_Chi_Minh';
  if (
    typeof locale !== 'string' ||
    !LOCALE_PATTERN.test(locale) ||
    typeof timezone !== 'string' ||
    !TIMEZONE_PATTERN.test(timezone)
  ) {
    throw new IdentityError(IDENTITY_ERROR_CODES.INVALID_PROFILE);
  }
  if (avatarUrl) {
    try {
      const url = new URL(avatarUrl);
      if (url.protocol !== 'https:') throw new Error();
    } catch {
      throw new IdentityError(IDENTITY_ERROR_CODES.INVALID_PROFILE);
    }
  }
  return Object.freeze({ displayName, avatarUrl, locale, timezone });
}

export function normalizeProfilePatch(input: ProfileInput) {
  const normalized = normalizeProfileInput(input);
  return Object.freeze({
    ...(input.displayName !== undefined
      ? { displayName: normalized.displayName }
      : {}),
    ...(input.avatarUrl !== undefined
      ? { avatarUrl: normalized.avatarUrl }
      : {}),
    ...(input.locale !== undefined ? { locale: normalized.locale } : {}),
    ...(input.timezone !== undefined ? { timezone: normalized.timezone } : {}),
  });
}

export function assertOwnership(ownerUserId: unknown, targetUserId: unknown) {
  const owner = requireIdentityId(ownerUserId);
  const target = requireIdentityId(targetUserId);
  if (owner !== target) {
    throw new IdentityError(IDENTITY_ERROR_CODES.FORBIDDEN_OWNERSHIP);
  }
  return owner;
}
