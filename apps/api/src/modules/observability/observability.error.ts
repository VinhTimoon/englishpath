export const OBSERVABILITY_ERROR_CODES = {
  INVALID_CORRELATION: 'OBSERVABILITY_INVALID_CORRELATION',
  INVALID_EVENT: 'OBSERVABILITY_INVALID_EVENT',
  INVALID_ATTRIBUTES: 'OBSERVABILITY_INVALID_ATTRIBUTES',
} as const;

export type ObservabilityErrorCode =
  (typeof OBSERVABILITY_ERROR_CODES)[keyof typeof OBSERVABILITY_ERROR_CODES];

const ERROR_MESSAGES: Readonly<Record<ObservabilityErrorCode, string>> = {
  OBSERVABILITY_INVALID_CORRELATION: 'Correlation context is invalid.',
  OBSERVABILITY_INVALID_EVENT: 'Observability event is invalid.',
  OBSERVABILITY_INVALID_ATTRIBUTES: 'Observability attributes are invalid.',
};

export class ObservabilityError extends Error {
  readonly code: ObservabilityErrorCode;

  constructor(code: ObservabilityErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = 'ObservabilityError';
    this.code = code;
  }
}
