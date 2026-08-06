export const TOEIC_ERROR_CODES = {
  NOT_FOUND: 'NOT_FOUND',
  REPOSITORY_FAILURE: 'REPOSITORY_FAILURE',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_CONTENT: 'INVALID_CONTENT',
  INVALID_LINEAGE: 'INVALID_LINEAGE',
  CONFLICT: 'CONFLICT',
  STALE_REVIEW: 'STALE_REVIEW',
  NOT_PUBLISHABLE: 'NOT_PUBLISHABLE',
  MISSING_IDEMPOTENCY_KEY: 'MISSING_IDEMPOTENCY_KEY',
  INCOMPLETE: 'INCOMPLETE',
} as const;

export type ToeicErrorCode =
  (typeof TOEIC_ERROR_CODES)[keyof typeof TOEIC_ERROR_CODES];

export class ToeicQuestionError extends Error {
  constructor(readonly code: ToeicErrorCode) {
    super(code);
    this.name = 'ToeicQuestionError';
  }
}
