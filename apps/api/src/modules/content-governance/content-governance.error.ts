export const CONTENT_GOVERNANCE_ERROR_CODES = {
  INVALID_METADATA: 'INVALID_METADATA',
  INVALID_TAXONOMY: 'INVALID_TAXONOMY',
  INVALID_TRANSITION: 'INVALID_TRANSITION',
  REVIEW_EVIDENCE_MISMATCH: 'REVIEW_EVIDENCE_MISMATCH',
  HUMAN_REVIEW_REQUIRED: 'HUMAN_REVIEW_REQUIRED',
  SELF_REVIEW_FORBIDDEN: 'SELF_REVIEW_FORBIDDEN',
  SELF_PUBLISH_FORBIDDEN: 'SELF_PUBLISH_FORBIDDEN',
  LICENSE_NOT_PUBLISHABLE: 'LICENSE_NOT_PUBLISHABLE',
  APPROVED_REVIEW_REQUIRED: 'APPROVED_REVIEW_REQUIRED',
  REVISION_EVIDENCE_UNCHANGED: 'REVISION_EVIDENCE_UNCHANGED',
  SOURCE_MANIFEST_INVALID: 'SOURCE_MANIFEST_INVALID',
  IMPORT_CONFLICT: 'IMPORT_CONFLICT',
} as const;

export type ContentGovernanceErrorCode =
  (typeof CONTENT_GOVERNANCE_ERROR_CODES)[keyof typeof CONTENT_GOVERNANCE_ERROR_CODES];

const ERROR_MESSAGES: Record<ContentGovernanceErrorCode, string> = {
  INVALID_METADATA: 'Content metadata is invalid.',
  INVALID_TAXONOMY: 'Content taxonomy is invalid.',
  INVALID_TRANSITION: 'Content lifecycle transition is not allowed.',
  REVIEW_EVIDENCE_MISMATCH:
    'Review evidence does not match the content version.',
  HUMAN_REVIEW_REQUIRED: 'Authorized human review evidence is required.',
  SELF_REVIEW_FORBIDDEN: 'Content cannot review itself.',
  SELF_PUBLISH_FORBIDDEN: 'Content cannot publish itself.',
  LICENSE_NOT_PUBLISHABLE: 'Content rights do not permit publication.',
  APPROVED_REVIEW_REQUIRED: 'Approved review evidence is required.',
  REVISION_EVIDENCE_UNCHANGED: 'A revision requires changed source evidence.',
  SOURCE_MANIFEST_INVALID: 'The source manifest is invalid or unvalidated.',
  IMPORT_CONFLICT:
    'The import identity conflicts with existing source evidence.',
};

export class ContentGovernanceError extends Error {
  readonly code: ContentGovernanceErrorCode;

  constructor(code: ContentGovernanceErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = 'ContentGovernanceError';
    this.code = code;
  }
}
