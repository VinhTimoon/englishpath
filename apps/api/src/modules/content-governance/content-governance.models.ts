import {
  CONTENT_GOVERNANCE_ERROR_CODES,
  ContentGovernanceError,
  type ContentGovernanceErrorCode,
} from './content-governance.error';

export const CONTENT_PROVENANCE = [
  'human_authored',
  'imported',
  'ai_assisted',
] as const;
export const CONTENT_USAGE_SCOPES = [
  'learning',
  'assessment',
  'library',
  'marketing',
] as const;
export const CONTENT_ACCESS_TIERS = [
  'public',
  'authenticated',
  'entitled',
] as const;
export const LICENSE_STATUSES = [
  'unknown',
  'blocked',
  'expired',
  'approved',
] as const;
export const REVIEW_STATUSES = ['draft', 'approved', 'rejected'] as const;
export const PUBLISH_STATUSES = ['draft', 'published'] as const;
export const CONTENT_AUTHORIZATION_ACTIONS = ['review', 'publish'] as const;
export const CONTENT_PERMISSIONS = [
  'content:review',
  'content:publish',
] as const;

export type ContentProvenance = (typeof CONTENT_PROVENANCE)[number];
export type ContentUsageScope = (typeof CONTENT_USAGE_SCOPES)[number];
export type ContentAccessTier = (typeof CONTENT_ACCESS_TIERS)[number];
export type LicenseStatus = (typeof LICENSE_STATUSES)[number];
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];
export type PublishStatus = (typeof PUBLISH_STATUSES)[number];
export type ContentAuthorizationAction =
  (typeof CONTENT_AUTHORIZATION_ACTIONS)[number];
export type ContentPermission = (typeof CONTENT_PERMISSIONS)[number];

export type SharedTaxonomy = Readonly<{
  level: string;
  topic: string;
  subtopic?: string;
  collocations: readonly string[];
  relatedSkills: readonly string[];
  tracks: readonly string[];
  toeicParts: readonly number[];
}>;

export type ContentSource = Readonly<{
  sourceId: string;
  sourceUrl?: string;
  checksum: string;
  sourceVersion: string;
}>;

export type ContentRights = Readonly<{
  owner: string;
  licenseStatus: LicenseStatus;
  allowedUsageScopes: readonly ContentUsageScope[];
  allowedAccessTiers: readonly ContentAccessTier[];
  validUntil?: string;
}>;

export type ReviewEvidence = Readonly<{
  reviewerId: string;
  decision: 'approved' | 'rejected';
  reviewedAt: string;
  contentId: string;
  versionId: string;
  checksum: string;
  sourceVersion: string;
}>;

export type HumanAuthorizationDecision = Readonly<{
  actorId: string;
  actorType: 'human';
  action: ContentAuthorizationAction;
  permission: ContentPermission;
}>;

export interface HumanAuthorizationPort {
  // The access adapter returns an ID only after authenticating a human and authorizing this action.
  authorizeHumanAction(action: ContentAuthorizationAction): string | null;
}

export type GovernedContentVersion = Readonly<{
  contentId: string;
  versionId: string;
  previousVersionId?: string;
  createdByActorId: string;
  provenance: ContentProvenance;
  usageScope: ContentUsageScope;
  accessTier: ContentAccessTier;
  taxonomy: SharedTaxonomy;
  source: ContentSource;
  rights: ContentRights;
  reviewStatus: ReviewStatus;
  publishStatus: PublishStatus;
  reviewEvidence?: ReviewEvidence;
}>;

export type CreateContentVersionInput = Readonly<{
  contentId: string;
  versionId: string;
  previousVersionId?: string;
  createdByActorId: string;
  provenance: ContentProvenance;
  usageScope: ContentUsageScope;
  accessTier: ContentAccessTier;
  taxonomy: SharedTaxonomy;
  source: ContentSource;
  rights: ContentRights;
}>;

const issuedContentVersions = new WeakSet<object>();

export function isIssuedContentVersion(
  value: unknown,
): value is GovernedContentVersion {
  return (
    typeof value === 'object' &&
    value !== null &&
    issuedContentVersions.has(value)
  );
}

function required(
  value: unknown,
  code: ContentGovernanceErrorCode = CONTENT_GOVERNANCE_ERROR_CODES.INVALID_METADATA,
) {
  if (typeof value !== 'string') {
    throw new ContentGovernanceError(code);
  }
  const normalized = value.trim();
  if (!normalized) {
    throw new ContentGovernanceError(code);
  }
  return normalized;
}

function optional(value: unknown) {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new ContentGovernanceError(
      CONTENT_GOVERNANCE_ERROR_CODES.INVALID_METADATA,
    );
  }
  const normalized = value.trim();
  return normalized || undefined;
}

function normalizeValues(values: unknown) {
  if (!Array.isArray(values)) {
    throw new ContentGovernanceError(
      CONTENT_GOVERNANCE_ERROR_CODES.INVALID_TAXONOMY,
    );
  }
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    if (typeof value !== 'string') {
      throw new ContentGovernanceError(
        CONTENT_GOVERNANCE_ERROR_CODES.INVALID_TAXONOMY,
      );
    }
    const displayValue = value.trim();
    const identity = displayValue.toLocaleLowerCase('en-US');
    if (!displayValue || seen.has(identity)) {
      continue;
    }
    seen.add(identity);
    normalized.push(displayValue);
  }

  return Object.freeze(normalized);
}

function requireMember<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T {
  if (!allowed.includes(value as T)) {
    throw new ContentGovernanceError(
      CONTENT_GOVERNANCE_ERROR_CODES.INVALID_METADATA,
    );
  }
  return value as T;
}

export function createSharedTaxonomy(input: SharedTaxonomy): SharedTaxonomy {
  if (!input || typeof input !== 'object' || !Array.isArray(input.toeicParts)) {
    throw new ContentGovernanceError(
      CONTENT_GOVERNANCE_ERROR_CODES.INVALID_TAXONOMY,
    );
  }
  const toeicParts = Object.freeze(
    [...new Set(input.toeicParts)].sort((left, right) => left - right),
  );
  if (
    toeicParts.some((part) => !Number.isInteger(part) || part < 1 || part > 7)
  ) {
    throw new ContentGovernanceError(
      CONTENT_GOVERNANCE_ERROR_CODES.INVALID_TAXONOMY,
    );
  }

  return Object.freeze({
    level: required(
      input.level,
      CONTENT_GOVERNANCE_ERROR_CODES.INVALID_TAXONOMY,
    ),
    topic: required(
      input.topic,
      CONTENT_GOVERNANCE_ERROR_CODES.INVALID_TAXONOMY,
    ),
    ...(optional(input.subtopic) ? { subtopic: optional(input.subtopic) } : {}),
    collocations: normalizeValues(input.collocations),
    relatedSkills: normalizeValues(input.relatedSkills),
    tracks: normalizeValues(input.tracks),
    toeicParts,
  });
}

function createSource(input: ContentSource): ContentSource {
  return Object.freeze({
    sourceId: required(input.sourceId),
    ...(optional(input.sourceUrl)
      ? { sourceUrl: optional(input.sourceUrl) }
      : {}),
    checksum: required(input.checksum),
    sourceVersion: required(input.sourceVersion),
  });
}

function createRights(input: ContentRights): ContentRights {
  const validUntil = optional(input.validUntil);
  if (validUntil && !Number.isFinite(Date.parse(validUntil))) {
    throw new ContentGovernanceError(
      CONTENT_GOVERNANCE_ERROR_CODES.INVALID_METADATA,
    );
  }

  if (
    !Array.isArray(input.allowedUsageScopes) ||
    input.allowedUsageScopes.length === 0 ||
    !Array.isArray(input.allowedAccessTiers) ||
    input.allowedAccessTiers.length === 0
  ) {
    throw new ContentGovernanceError(
      CONTENT_GOVERNANCE_ERROR_CODES.INVALID_METADATA,
    );
  }

  const allowedUsageScopes = Object.freeze(
    [...new Set(input.allowedUsageScopes)].map((scope) =>
      requireMember(scope, CONTENT_USAGE_SCOPES),
    ),
  );
  const allowedAccessTiers = Object.freeze(
    [...new Set(input.allowedAccessTiers)].map((tier) =>
      requireMember(tier, CONTENT_ACCESS_TIERS),
    ),
  );

  return Object.freeze({
    owner: required(input.owner),
    licenseStatus: requireMember(input.licenseStatus, LICENSE_STATUSES),
    allowedUsageScopes,
    allowedAccessTiers,
    ...(validUntil ? { validUntil } : {}),
  });
}

export function freezeReviewEvidence(input: ReviewEvidence): ReviewEvidence {
  if (
    !input ||
    typeof input !== 'object' ||
    typeof input.reviewedAt !== 'string' ||
    !Number.isFinite(Date.parse(input.reviewedAt))
  ) {
    throw new ContentGovernanceError(
      CONTENT_GOVERNANCE_ERROR_CODES.INVALID_METADATA,
    );
  }

  return Object.freeze({
    reviewerId: required(input.reviewerId),
    decision: requireMember(input.decision, ['approved', 'rejected'] as const),
    reviewedAt: required(input.reviewedAt),
    contentId: required(input.contentId),
    versionId: required(input.versionId),
    checksum: required(input.checksum),
    sourceVersion: required(input.sourceVersion),
  });
}

export function createGovernedContentVersion(
  input: CreateContentVersionInput,
): GovernedContentVersion {
  if (!input || typeof input !== 'object') {
    throw new ContentGovernanceError(
      CONTENT_GOVERNANCE_ERROR_CODES.INVALID_METADATA,
    );
  }
  try {
    const version: GovernedContentVersion = Object.freeze({
      contentId: required(input.contentId),
      versionId: required(input.versionId),
      ...(optional(input.previousVersionId)
        ? { previousVersionId: optional(input.previousVersionId) }
        : {}),
      createdByActorId: required(input.createdByActorId),
      provenance: requireMember(input.provenance, CONTENT_PROVENANCE),
      usageScope: requireMember(input.usageScope, CONTENT_USAGE_SCOPES),
      accessTier: requireMember(input.accessTier, CONTENT_ACCESS_TIERS),
      taxonomy: createSharedTaxonomy(input.taxonomy),
      source: createSource(input.source),
      rights: createRights(input.rights),
      reviewStatus: 'draft',
      publishStatus: 'draft',
    });
    issuedContentVersions.add(version);
    return version;
  } catch (error: unknown) {
    if (error instanceof ContentGovernanceError) {
      throw error;
    }
    throw new ContentGovernanceError(
      CONTENT_GOVERNANCE_ERROR_CODES.INVALID_METADATA,
    );
  }
}
