export const TOEIC_ERROR_CODES = {
  NOT_FOUND: 'NOT_FOUND',
  REPOSITORY_FAILURE: 'REPOSITORY_FAILURE',
} as const;

export type ToeicErrorCode =
  (typeof TOEIC_ERROR_CODES)[keyof typeof TOEIC_ERROR_CODES];

export class ToeicQuestionError extends Error {
  constructor(readonly code: ToeicErrorCode) {
    super(code);
    this.name = 'ToeicQuestionError';
  }
}
