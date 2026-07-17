export const IDENTITY_ERROR_CODES = {
  IDENTITY_NOT_FOUND: 'IDENTITY_NOT_FOUND',
  DUPLICATE_IDENTITY: 'DUPLICATE_IDENTITY',
  INACTIVE_IDENTITY: 'INACTIVE_IDENTITY',
  FORBIDDEN_OWNERSHIP: 'FORBIDDEN_OWNERSHIP',
  INVALID_IDENTITY: 'INVALID_IDENTITY',
  INVALID_PROFILE: 'INVALID_PROFILE',
  INVALID_ROLE: 'INVALID_ROLE',
  PERSISTENCE_FAILURE: 'PERSISTENCE_FAILURE',
} as const;

export type IdentityErrorCode =
  (typeof IDENTITY_ERROR_CODES)[keyof typeof IDENTITY_ERROR_CODES];

const MESSAGES: Record<IdentityErrorCode, string> = {
  IDENTITY_NOT_FOUND: 'Application identity was not found.',
  DUPLICATE_IDENTITY: 'Application identity already exists.',
  INACTIVE_IDENTITY: 'Application identity is not active.',
  FORBIDDEN_OWNERSHIP: 'Resource ownership is required.',
  INVALID_IDENTITY: 'Application identity input is invalid.',
  INVALID_PROFILE: 'Profile input is invalid.',
  INVALID_ROLE: 'Application role input is invalid.',
  PERSISTENCE_FAILURE: 'Identity persistence operation failed.',
};

export class IdentityError extends Error {
  constructor(readonly code: IdentityErrorCode) {
    super(MESSAGES[code]);
    this.name = 'IdentityError';
  }
}
