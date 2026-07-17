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
} from './content-governance.models';

const issuedHumanDecisions = new WeakSet<object>();
const issuedLifecycleVersions = new WeakSet<object>();
const issuedReviewedVersions = new WeakSet<object>();

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
