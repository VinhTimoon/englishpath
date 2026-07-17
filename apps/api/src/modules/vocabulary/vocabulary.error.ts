export const VOCABULARY_ERROR_CODES = {
  INVALID_QUERY: 'INVALID_QUERY',
  INVALID_GRAPH: 'INVALID_GRAPH',
  ROOT_NOT_FOUND: 'ROOT_NOT_FOUND',
} as const;

export type VocabularyErrorCode =
  (typeof VOCABULARY_ERROR_CODES)[keyof typeof VOCABULARY_ERROR_CODES];

const messages: Record<VocabularyErrorCode, string> = {
  INVALID_QUERY: 'Vocabulary query is invalid.',
  INVALID_GRAPH: 'Vocabulary taxonomy is unavailable.',
  ROOT_NOT_FOUND: 'Vocabulary taxonomy root was not found.',
};

export class VocabularyError extends Error {
  constructor(readonly code: VocabularyErrorCode) {
    super(messages[code]);
    this.name = 'VocabularyError';
  }
}
