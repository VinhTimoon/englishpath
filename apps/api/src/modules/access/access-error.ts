export const ACCESS_ERROR_CODES = {
  MISSING_BEARER_CREDENTIAL: 'MISSING_BEARER_CREDENTIAL',
  MALFORMED_BEARER_CREDENTIAL: 'MALFORMED_BEARER_CREDENTIAL',
  INVALID_IDENTITY_EVIDENCE: 'INVALID_IDENTITY_EVIDENCE',
  APPLICATION_IDENTITY_UNRESOLVED: 'APPLICATION_IDENTITY_UNRESOLVED',
  FORBIDDEN_ROLE: 'FORBIDDEN_ROLE',
  FORBIDDEN_OWNERSHIP: 'FORBIDDEN_OWNERSHIP',
} as const;

export type AccessErrorCode =
  (typeof ACCESS_ERROR_CODES)[keyof typeof ACCESS_ERROR_CODES];

const ACCESS_ERROR_MESSAGES: Record<AccessErrorCode, string> = {
  MISSING_BEARER_CREDENTIAL: 'Bearer credential is required.',
  MALFORMED_BEARER_CREDENTIAL: 'Bearer credential is malformed.',
  INVALID_IDENTITY_EVIDENCE: 'Identity evidence is invalid.',
  APPLICATION_IDENTITY_UNRESOLVED:
    'Application identity could not be resolved.',
  FORBIDDEN_ROLE: 'Required application role is missing.',
  FORBIDDEN_OWNERSHIP: 'Required resource ownership is missing.',
};

export class AccessError extends Error {
  readonly code: AccessErrorCode;

  constructor(code: AccessErrorCode) {
    super(ACCESS_ERROR_MESSAGES[code]);
    this.name = 'AccessError';
    this.code = code;
  }
}

export function isAccessError(error: unknown): error is AccessError {
  return error instanceof AccessError;
}
