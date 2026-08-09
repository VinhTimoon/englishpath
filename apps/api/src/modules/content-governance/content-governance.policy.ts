import {
  CONTENT_GOVERNANCE_ERROR_CODES,
  ContentGovernanceError,
} from './content-governance.error';
import {
  createGovernedContentVersion,
  freezeReviewEvidence,
  isIssuedContentVersion,
  CONTENT_AUTHORIZATION_ACTIONS,
  type ContentAuthorizationAction,
  type GovernedContentVersion,
  type HumanAuthorizationDecision,
  type HumanAuthorizationPort,
  type ReviewEvidence,
  type CreateContentVersionInput,
  type OperatorContentProjection,
  type ValidatedSourceManifest,
} from './content-governance.models';

const issuedHumanDecisions = new WeakSet<object>();
const issuedLifecycleVersions = new WeakSet<object>();
const issuedReviewedVersions = new WeakSet<object>();
const importReplay = new Map<string, GovernedContentVersion>();
const CHECKSUM_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._-]{0,31}:[A-Za-z0-9+/=_-]{1,512}$/;
const SOURCE_VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@/+~-]{0,255}$/;

const permissionFor = {
  review: 'content:review',
  publish: 'content:publish',
} as const;

function runPolicy<T>(operation: () => T): T {
  try {
    return operation();
  } catch (error: unknown) {
    if (error instanceof ContentGovernanceError) {
      throw error;
    }
    throw new ContentGovernanceError(
      CONTENT_GOVERNANCE_ERROR_CODES.INVALID_METADATA,
    );
  }
}

function requireIssuedVersion(value: unknown): GovernedContentVersion {
  if (
    !isIssuedContentVersion(value) &&
    !(
      typeof value === 'object' &&
      value !== null &&
      issuedLifecycleVersions.has(value)
    )
  ) {
    throw new ContentGovernanceError(
      CONTENT_GOVERNANCE_ERROR_CODES.INVALID_METADATA,
    );
  }
  return value as GovernedContentVersion;
}

export function authorizeHumanContentAction(
  port: HumanAuthorizationPort,
  action: ContentAuthorizationAction,
): HumanAuthorizationDecision {
  return runPolicy(() => {
    if (
      !port ||
      typeof port !== 'object' ||
      typeof port.authorizeHumanAction !== 'function' ||
      !CONTENT_AUTHORIZATION_ACTIONS.includes(action)
    ) {
      throw new ContentGovernanceError(
        CONTENT_GOVERNANCE_ERROR_CODES.HUMAN_REVIEW_REQUIRED,
      );
    }

    const authorizedActorId = port.authorizeHumanAction(action);
    const actorId =
      typeof authorizedActorId === 'string'
        ? authorizedActorId.trim()
        : undefined;
    if (!actorId) {
      throw new ContentGovernanceError(
        CONTENT_GOVERNANCE_ERROR_CODES.HUMAN_REVIEW_REQUIRED,
      );
    }
    const decision = Object.freeze({
      actorId,
      actorType: 'human' as const,
      action,
      permission: permissionFor[action],
    });
    issuedHumanDecisions.add(decision);
    return decision;
  });
}

function manifestKey(manifest: ValidatedSourceManifest) {
  return `${manifest.contentId}\u0000${manifest.versionId}`;
}

function validateManifestIdentity(manifest: ValidatedSourceManifest) {
  if (
    !CHECKSUM_PATTERN.test(manifest.checksum.trim()) ||
    !SOURCE_VERSION_PATTERN.test(manifest.sourceVersion.trim())
  ) {
    throw new ContentGovernanceError(
      CONTENT_GOVERNANCE_ERROR_CODES.SOURCE_MANIFEST_INVALID,
    );
  }
}

export type ValidatedSourceManifestImport = Readonly<{
  manifest: ValidatedSourceManifest;
  input: Omit<CreateContentVersionInput, 'contentId' | 'versionId' | 'source'>;
}>;

export type ReviewedSourceManifestImport = Readonly<
  ValidatedSourceManifestImport & {
    reviewEvidence: ReviewEvidence;
    reviewAuthorization: HumanAuthorizationDecision;
    publishAuthorization: HumanAuthorizationDecision;
  }
>;

/** Imports metadata only; it never grants rights, delivery, review, or publication. */
export function importValidatedSourceManifest(
  manifest: ValidatedSourceManifest,
  input: Omit<CreateContentVersionInput, 'contentId' | 'versionId' | 'source'>,
): GovernedContentVersion {
  return runPolicy(() => {
    if (
      !manifest ||
      manifest.validated !== true ||
      typeof manifest !== 'object'
    ) {
      throw new ContentGovernanceError(
        CONTENT_GOVERNANCE_ERROR_CODES.SOURCE_MANIFEST_INVALID,
      );
    }
    const values = [
      manifest.contentId,
      manifest.versionId,
      manifest.sourceId,
      manifest.checksum,
      manifest.sourceVersion,
    ];
    if (values.some((value) => typeof value !== 'string' || !value.trim())) {
      throw new ContentGovernanceError(
        CONTENT_GOVERNANCE_ERROR_CODES.SOURCE_MANIFEST_INVALID,
      );
    }
    validateManifestIdentity(manifest);
    const key = manifestKey(manifest);
    const existing = importReplay.get(key);
    if (existing) {
      if (
        existing.source.checksum !== manifest.checksum ||
        existing.source.sourceVersion !== manifest.sourceVersion
      ) {
        throw new ContentGovernanceError(
          CONTENT_GOVERNANCE_ERROR_CODES.IMPORT_CONFLICT,
        );
      }
      return existing;
    }
    const draft = createGovernedContentVersion({
      ...input,
      contentId: manifest.contentId,
      versionId: manifest.versionId,
      source: {
        sourceId: manifest.sourceId,
        checksum: manifest.checksum,
        sourceVersion: manifest.sourceVersion,
      },
    });
    importReplay.set(key, draft);
    return draft;
  });
}

/** Validates the complete local batch before changing replay state. */
export function importValidatedSourceManifestBatch(
  batch: readonly ValidatedSourceManifestImport[],
): readonly GovernedContentVersion[] {
  return runPolicy(() => {
    if (!batch || typeof batch !== 'object' || batch.length === 0) {
      throw new ContentGovernanceError(
        CONTENT_GOVERNANCE_ERROR_CODES.SOURCE_MANIFEST_INVALID,
      );
    }

    const keys = new Set<string>();
    const sourceEvidence = new Map<string, string>();
    const staged: GovernedContentVersion[] = [];

    for (const entry of batch) {
      if (!entry || typeof entry !== 'object') {
        throw new ContentGovernanceError(
          CONTENT_GOVERNANCE_ERROR_CODES.SOURCE_MANIFEST_INVALID,
        );
      }
      const { manifest } = entry;
      const key = manifestKey(manifest);
      if (keys.has(key)) {
        throw new ContentGovernanceError(
          CONTENT_GOVERNANCE_ERROR_CODES.IMPORT_CONFLICT,
        );
      }
      keys.add(key);
      validateManifestIdentity(manifest);

      const evidence = `${manifest.checksum}\u0000${manifest.sourceVersion}`;
      const priorIdentity = sourceEvidence.get(manifest.sourceId);
      if (priorIdentity && priorIdentity !== evidence) {
        throw new ContentGovernanceError(
          CONTENT_GOVERNANCE_ERROR_CODES.IMPORT_CONFLICT,
        );
      }
      sourceEvidence.set(manifest.sourceId, evidence);

      const existing = importReplay.get(key);
      if (existing) {
        if (
          existing.source.checksum !== manifest.checksum ||
          existing.source.sourceVersion !== manifest.sourceVersion
        ) {
          throw new ContentGovernanceError(
            CONTENT_GOVERNANCE_ERROR_CODES.IMPORT_CONFLICT,
          );
        }
        staged.push(existing);
        continue;
      }
      staged.push(
        createGovernedContentVersion({
          ...entry.input,
          contentId: manifest.contentId,
          versionId: manifest.versionId,
          source: {
            sourceId: manifest.sourceId,
            checksum: manifest.checksum,
            sourceVersion: manifest.sourceVersion,
          },
        }),
      );
    }

    for (const version of staged) {
      const key = `${version.contentId}\u0000${version.versionId}`;
      if (!importReplay.has(key)) importReplay.set(key, version);
    }
    return Object.freeze(staged);
  });
}

/**
 * Imports a complete reviewed batch and only returns learner-eligible
 * lifecycle versions after every entry has passed review and publication
 * policy. The local replay boundary remains deterministic and credential-free.
 */
export function importReviewedSourceManifestBatch(
  batch: readonly ReviewedSourceManifestImport[],
  options: Readonly<{ now?: () => number }> = {},
): readonly GovernedContentVersion[] {
  return runPolicy(() => {
    const drafts = importValidatedSourceManifestBatch(
      batch.map(({ manifest, input }) => ({ manifest, input })),
    );
    const published = batch.map((entry, index) => {
      const reviewed = reviewContentVersion(
        drafts[index],
        entry.reviewEvidence,
        entry.reviewAuthorization,
      );
      return publishContentVersion(reviewed, {
        authorization: entry.publishAuthorization,
        now: options.now,
      });
    });
    return Object.freeze(published);
  });
}

export function toOperatorContentProjection(
  version: GovernedContentVersion,
): OperatorContentProjection {
  const issued = requireIssuedVersion(version);
  return Object.freeze({
    contentId: issued.contentId,
    versionId: issued.versionId,
    reviewStatus: issued.reviewStatus,
    publishStatus: issued.publishStatus,
    usageScope: issued.usageScope,
    accessTier: issued.accessTier,
    licenseStatus: issued.rights.licenseStatus,
    sourceEvidence: Object.freeze({
      checksum: issued.source.checksum,
      sourceVersion: issued.source.sourceVersion,
    }),
  });
}

function requireHumanDecision(
  decision: HumanAuthorizationDecision,
  action: ContentAuthorizationAction,
) {
  if (
    !decision ||
    typeof decision !== 'object' ||
    !issuedHumanDecisions.has(decision) ||
    decision.actorType !== 'human' ||
    decision.action !== action ||
    decision.permission !== permissionFor[action]
  ) {
    throw new ContentGovernanceError(
      CONTENT_GOVERNANCE_ERROR_CODES.HUMAN_REVIEW_REQUIRED,
    );
  }
}

function cloneLifecycleState(
  version: GovernedContentVersion,
  changes: Readonly<{
    reviewStatus?: GovernedContentVersion['reviewStatus'];
    publishStatus?: GovernedContentVersion['publishStatus'];
    reviewEvidence?: ReviewEvidence;
  }>,
): GovernedContentVersion {
  return Object.freeze({
    ...version,
    ...changes,
    ...(changes.reviewEvidence
      ? { reviewEvidence: freezeReviewEvidence(changes.reviewEvidence) }
      : {}),
  });
}

function requireDraft(version: GovernedContentVersion) {
  if (version.publishStatus !== 'draft') {
    throw new ContentGovernanceError(
      CONTENT_GOVERNANCE_ERROR_CODES.INVALID_TRANSITION,
    );
  }
}

function requireMatchingEvidence(
  version: GovernedContentVersion,
  evidence: ReviewEvidence,
) {
  if (
    evidence.contentId !== version.contentId ||
    evidence.versionId !== version.versionId ||
    evidence.checksum !== version.source.checksum ||
    evidence.sourceVersion !== version.source.sourceVersion
  ) {
    throw new ContentGovernanceError(
      CONTENT_GOVERNANCE_ERROR_CODES.REVIEW_EVIDENCE_MISMATCH,
    );
  }
}

export function reviewContentVersion(
  version: GovernedContentVersion,
  evidence: ReviewEvidence,
  authorization: HumanAuthorizationDecision,
): GovernedContentVersion {
  return runPolicy(() => {
    const issuedVersion = requireIssuedVersion(version);
    requireDraft(issuedVersion);
    if (issuedVersion.reviewStatus !== 'draft') {
      throw new ContentGovernanceError(
        CONTENT_GOVERNANCE_ERROR_CODES.INVALID_TRANSITION,
      );
    }
    requireHumanDecision(authorization, 'review');
    if (authorization.actorId !== evidence.reviewerId) {
      throw new ContentGovernanceError(
        CONTENT_GOVERNANCE_ERROR_CODES.HUMAN_REVIEW_REQUIRED,
      );
    }
    requireMatchingEvidence(issuedVersion, evidence);
    if (
      issuedVersion.provenance !== 'human_authored' &&
      authorization.actorId === issuedVersion.createdByActorId
    ) {
      throw new ContentGovernanceError(
        CONTENT_GOVERNANCE_ERROR_CODES.SELF_REVIEW_FORBIDDEN,
      );
    }

    const frozenEvidence = freezeReviewEvidence(evidence);
    const reviewedVersion = cloneLifecycleState(issuedVersion, {
      reviewStatus: frozenEvidence.decision,
      reviewEvidence: frozenEvidence,
    });
    issuedLifecycleVersions.add(reviewedVersion);
    issuedReviewedVersions.add(reviewedVersion);
    return reviewedVersion;
  });
}

function rightsPermitPublication(
  version: GovernedContentVersion,
  now: () => number,
) {
  if (version.rights.licenseStatus !== 'approved') {
    return false;
  }
  if (
    !version.rights.allowedUsageScopes.includes(version.usageScope) ||
    !version.rights.allowedAccessTiers.includes(version.accessTier)
  ) {
    return false;
  }
  if (!version.rights.validUntil) {
    return true;
  }
  const validUntil = Date.parse(version.rights.validUntil);
  return Number.isFinite(validUntil) && validUntil > now();
}

export function isPublicLearningContentVersion(
  value: unknown,
  now: () => number = Date.now,
): value is GovernedContentVersion {
  try {
    const version = requireIssuedVersion(value);
    return (
      version.publishStatus === 'published' &&
      version.reviewStatus === 'approved' &&
      version.usageScope === 'learning' &&
      version.accessTier === 'public' &&
      rightsPermitPublication(version, now)
    );
  } catch {
    return false;
  }
}

export function publishContentVersion(
  version: GovernedContentVersion,
  options: Readonly<{
    authorization: HumanAuthorizationDecision;
    now?: () => number;
  }>,
): GovernedContentVersion {
  return runPolicy(() => {
    const issuedVersion = requireIssuedVersion(version);
    requireDraft(issuedVersion);
    requireHumanDecision(options.authorization, 'publish');
    if (
      issuedVersion.provenance !== 'human_authored' &&
      options.authorization.actorId === issuedVersion.createdByActorId
    ) {
      throw new ContentGovernanceError(
        CONTENT_GOVERNANCE_ERROR_CODES.SELF_PUBLISH_FORBIDDEN,
      );
    }
    if (
      !issuedReviewedVersions.has(issuedVersion) ||
      issuedVersion.reviewStatus !== 'approved' ||
      !issuedVersion.reviewEvidence
    ) {
      throw new ContentGovernanceError(
        CONTENT_GOVERNANCE_ERROR_CODES.APPROVED_REVIEW_REQUIRED,
      );
    }
    requireMatchingEvidence(issuedVersion, issuedVersion.reviewEvidence);
    if (!rightsPermitPublication(issuedVersion, options.now ?? Date.now)) {
      throw new ContentGovernanceError(
        CONTENT_GOVERNANCE_ERROR_CODES.LICENSE_NOT_PUBLISHABLE,
      );
    }

    const publishedVersion = cloneLifecycleState(issuedVersion, {
      publishStatus: 'published',
    });
    issuedLifecycleVersions.add(publishedVersion);
    return publishedVersion;
  });
}

export type RevisionInput = Readonly<{
  versionId: string;
  checksum: string;
  sourceVersion: string;
  sourceUrl?: string;
  createdByActorId: string;
}>;

export function reviseContentVersion(
  previous: GovernedContentVersion,
  input: RevisionInput,
): GovernedContentVersion {
  return runPolicy(() => {
    const issuedPrevious = requireIssuedVersion(previous);
    if (input.versionId.trim() === issuedPrevious.versionId) {
      throw new ContentGovernanceError(
        CONTENT_GOVERNANCE_ERROR_CODES.INVALID_METADATA,
      );
    }
    if (
      input.checksum.trim() === issuedPrevious.source.checksum &&
      input.sourceVersion.trim() === issuedPrevious.source.sourceVersion
    ) {
      throw new ContentGovernanceError(
        CONTENT_GOVERNANCE_ERROR_CODES.REVISION_EVIDENCE_UNCHANGED,
      );
    }

    return createGovernedContentVersion({
      contentId: issuedPrevious.contentId,
      versionId: input.versionId,
      previousVersionId: issuedPrevious.versionId,
      createdByActorId: input.createdByActorId,
      provenance: issuedPrevious.provenance,
      usageScope: issuedPrevious.usageScope,
      accessTier: issuedPrevious.accessTier,
      taxonomy: issuedPrevious.taxonomy,
      source: {
        sourceId: issuedPrevious.source.sourceId,
        sourceUrl: input.sourceUrl ?? issuedPrevious.source.sourceUrl,
        checksum: input.checksum,
        sourceVersion: input.sourceVersion,
      },
      rights: issuedPrevious.rights,
    });
  });
}
