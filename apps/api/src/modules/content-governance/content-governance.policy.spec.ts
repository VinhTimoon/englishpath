import {
  CONTENT_GOVERNANCE_ERROR_CODES,
  ContentGovernanceError,
  type ContentGovernanceErrorCode,
} from './content-governance.error';
import {
  createGovernedContentVersion,
  type CreateContentVersionInput,
  type GovernedContentVersion,
  type ReviewEvidence,
} from './content-governance.models';
import {
  authorizeHumanContentAction,
  isPublicLearningContentVersion,
  publishContentVersion,
  reviewContentVersion,
  reviseContentVersion,
} from './content-governance.policy';

const baseInput: CreateContentVersionInput = {
  contentId: 'content-1',
  versionId: 'version-1',
  createdByActorId: 'import-job-1',
  provenance: 'imported',
  usageScope: 'learning',
  accessTier: 'authenticated',
  taxonomy: {
    level: 'B1',
    topic: 'Workplace',
    subtopic: 'Meetings',
    collocations: ['take notes'],
    relatedSkills: ['Listening', 'Speaking'],
    tracks: ['Daily English', 'TOEIC'],
    toeicParts: [2, 3],
  },
  source: {
    sourceId: 'drive-file-1',
    sourceUrl: 'https://private.example/source',
    checksum: 'sha256:abc',
    sourceVersion: 'drive-v1',
  },
  rights: {
    owner: 'EnglishPath',
    licenseStatus: 'approved',
    allowedUsageScopes: ['learning'],
    allowedAccessTiers: ['authenticated'],
    validUntil: '2027-01-01T00:00:00.000Z',
  },
};

const fixedNow = () => Date.parse('2026-07-17T00:00:00.000Z');

function expectGovernanceError(
  action: () => unknown,
  code: ContentGovernanceErrorCode,
) {
  try {
    action();
    fail('Expected content governance operation to throw.');
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(ContentGovernanceError);
    expect(error).toMatchObject({ code });
  }
}

function evidenceFor(
  version: GovernedContentVersion,
  changes: Partial<ReviewEvidence> = {},
): ReviewEvidence {
  return {
    reviewerId: 'editor-1',
    decision: 'approved',
    reviewedAt: '2026-07-17T01:00:00.000Z',
    contentId: version.contentId,
    versionId: version.versionId,
    checksum: version.source.checksum,
    sourceVersion: version.source.sourceVersion,
    ...changes,
  };
}

function humanAuthorization(
  action: 'review' | 'publish',
  actorId = action === 'review' ? 'editor-1' : 'publisher-1',
) {
  return authorizeHumanContentAction(
    {
      authorizeHumanAction: () => actorId,
    },
    action,
  );
}

function approvedVersion(input = baseInput) {
  const draft = createGovernedContentVersion(input);
  return reviewContentVersion(
    draft,
    evidenceFor(draft),
    humanAuthorization('review'),
  );
}

describe('content governance lifecycle policy', () => {
  it('recognizes only issued, current, public learning publications', () => {
    const draft = createGovernedContentVersion({
      ...baseInput,
      accessTier: 'public',
      rights: { ...baseInput.rights, allowedAccessTiers: ['public'] },
    });
    const reviewed = reviewContentVersion(
      draft,
      evidenceFor(draft),
      humanAuthorization('review'),
    );
    const published = publishContentVersion(reviewed, {
      authorization: humanAuthorization('publish'),
      now: fixedNow,
    });

    expect(isPublicLearningContentVersion(draft, fixedNow)).toBe(false);
    expect(isPublicLearningContentVersion({ ...published }, fixedNow)).toBe(
      false,
    );
    expect(isPublicLearningContentVersion(published, fixedNow)).toBe(true);
    expect(
      isPublicLearningContentVersion(published, () =>
        Date.parse('2028-01-01T00:00:00.000Z'),
      ),
    ).toBe(false);
  });

  it('fails public projection closed for rejected and non-publishable rights', () => {
    const publicInput: CreateContentVersionInput = {
      ...baseInput,
      accessTier: 'public',
      rights: { ...baseInput.rights, allowedAccessTiers: ['public'] },
    };
    const rejectedDraft = createGovernedContentVersion(publicInput);
    const rejected = reviewContentVersion(
      rejectedDraft,
      evidenceFor(rejectedDraft, { decision: 'rejected' }),
      humanAuthorization('review'),
    );
    expect(isPublicLearningContentVersion(rejected, fixedNow)).toBe(false);

    for (const licenseStatus of ['unknown', 'blocked'] as const) {
      const draft = createGovernedContentVersion({
        ...publicInput,
        contentId: `content-${licenseStatus}`,
        versionId: `version-${licenseStatus}`,
        rights: { ...publicInput.rights, licenseStatus },
      });
      expect(isPublicLearningContentVersion(draft, fixedNow)).toBe(false);
    }

    const expiringDraft = createGovernedContentVersion({
      ...publicInput,
      contentId: 'content-expired',
      versionId: 'version-expired',
      rights: {
        ...publicInput.rights,
        validUntil: '2020-01-01T00:00:00.000Z',
      },
    });
    const expiringReviewed = reviewContentVersion(
      expiringDraft,
      evidenceFor(expiringDraft),
      humanAuthorization('review'),
    );
    const expired = publishContentVersion(expiringReviewed, {
      authorization: humanAuthorization('publish'),
      now: () => Date.parse('2019-01-01T00:00:00.000Z'),
    });
    expect(isPublicLearningContentVersion(expired, fixedNow)).toBe(false);
  });

  it('publishes a separately reviewed version with compatible current rights', () => {
    const approved = approvedVersion();
    const published = publishContentVersion(approved, {
      authorization: humanAuthorization('publish'),
      now: fixedNow,
    });

    expect(published.publishStatus).toBe('published');
    expect(published.reviewStatus).toBe('approved');
    expect(published.reviewEvidence).toEqual(evidenceFor(approved));
    expect(Object.isFrozen(published)).toBe(true);
    expect(approved.publishStatus).toBe('draft');
  });

  it.each(['imported', 'ai_assisted'] as const)(
    'prevents %s content from reviewing itself',
    (provenance) => {
      const draft = createGovernedContentVersion({
        ...baseInput,
        provenance,
        createdByActorId: 'editor-1',
      });

      expectGovernanceError(
        () =>
          reviewContentVersion(
            draft,
            evidenceFor(draft),
            humanAuthorization('review'),
          ),
        CONTENT_GOVERNANCE_ERROR_CODES.SELF_REVIEW_FORBIDDEN,
      );
    },
  );

  it('requires a policy-issued human authorization decision', () => {
    const draft = createGovernedContentVersion(baseInput);
    expectGovernanceError(
      () =>
        reviewContentVersion(draft, evidenceFor(draft), {
          actorId: 'editor-1',
          actorType: 'human',
          action: 'review',
          permission: 'content:review',
        }),
      CONTENT_GOVERNANCE_ERROR_CODES.HUMAN_REVIEW_REQUIRED,
    );
  });

  it('binds the authorization actor to the review evidence', () => {
    const draft = createGovernedContentVersion(baseInput);
    expectGovernanceError(
      () =>
        reviewContentVersion(
          draft,
          evidenceFor(draft),
          humanAuthorization('review', 'different-editor'),
        ),
      CONTENT_GOVERNANCE_ERROR_CODES.HUMAN_REVIEW_REQUIRED,
    );
  });

  it.each([null, '', 42])(
    'fails closed for a denied or malformed port result: %p',
    (result) => {
      expectGovernanceError(
        () =>
          authorizeHumanContentAction(
            { authorizeHumanAction: () => result } as never,
            'review',
          ),
        CONTENT_GOVERNANCE_ERROR_CODES.HUMAN_REVIEW_REQUIRED,
      );
    },
  );

  it('does not accept caller identity and permission claims as an authorization port', () => {
    expectGovernanceError(
      () =>
        authorizeHumanContentAction(
          {
            actorId: 'editor-1',
            actorType: 'human',
            permissions: ['content:review'],
          } as never,
          'review',
        ),
      CONTENT_GOVERNANCE_ERROR_CODES.HUMAN_REVIEW_REQUIRED,
    );
  });

  it.each(['imported', 'ai_assisted'] as const)(
    'prevents the %s creator from publishing itself',
    (provenance) => {
      const approved = approvedVersion({
        ...baseInput,
        provenance,
        createdByActorId: 'publisher-1',
      });

      expectGovernanceError(
        () =>
          publishContentVersion(approved, {
            authorization: humanAuthorization('publish', 'publisher-1'),
            now: fixedNow,
          }),
        CONTENT_GOVERNANCE_ERROR_CODES.SELF_PUBLISH_FORBIDDEN,
      );
    },
  );

  it('rejects malformed human review timestamps', () => {
    const draft = createGovernedContentVersion(baseInput);
    expectGovernanceError(
      () =>
        reviewContentVersion(
          draft,
          evidenceFor(draft, { reviewedAt: 'not-a-date' }),
          humanAuthorization('review'),
        ),
      CONTENT_GOVERNANCE_ERROR_CODES.INVALID_METADATA,
    );
  });

  it.each([
    { checksum: 'sha256:other' },
    { sourceVersion: 'drive-v2' },
    { versionId: 'version-other' },
    { contentId: 'content-other' },
  ])('binds review evidence to the exact version: %p', (changes) => {
    const draft = createGovernedContentVersion(baseInput);
    expectGovernanceError(
      () =>
        reviewContentVersion(
          draft,
          evidenceFor(draft, changes),
          humanAuthorization('review'),
        ),
      CONTENT_GOVERNANCE_ERROR_CODES.REVIEW_EVIDENCE_MISMATCH,
    );
  });

  it('does not publish rejected or unreviewed drafts', () => {
    const draft = createGovernedContentVersion(baseInput);
    const rejected = reviewContentVersion(
      draft,
      evidenceFor(draft, { decision: 'rejected' }),
      humanAuthorization('review'),
    );

    for (const version of [draft, rejected]) {
      expectGovernanceError(
        () =>
          publishContentVersion(version, {
            authorization: humanAuthorization('publish'),
            now: fixedNow,
          }),
        CONTENT_GOVERNANCE_ERROR_CODES.APPROVED_REVIEW_REQUIRED,
      );
    }
  });

  it('rejects a caller-constructed approved version', () => {
    const draft = createGovernedContentVersion(baseInput);
    const forged = Object.freeze({
      ...draft,
      reviewStatus: 'approved' as const,
      reviewEvidence: evidenceFor(draft),
    });

    expectGovernanceError(
      () =>
        publishContentVersion(forged, {
          authorization: humanAuthorization('publish'),
          now: fixedNow,
        }),
      CONTENT_GOVERNANCE_ERROR_CODES.INVALID_METADATA,
    );
  });

  it.each(['approved', 'rejected'] as const)(
    'requires a new revision after a %s review decision',
    (decision) => {
      const draft = createGovernedContentVersion(baseInput);
      const reviewed = reviewContentVersion(
        draft,
        evidenceFor(draft, { decision }),
        humanAuthorization('review'),
      );

      expectGovernanceError(
        () =>
          reviewContentVersion(
            reviewed,
            evidenceFor(reviewed, { decision: 'approved' }),
            humanAuthorization('review'),
          ),
        CONTENT_GOVERNANCE_ERROR_CODES.INVALID_TRANSITION,
      );
    },
  );

  it('rejects invalid runtime review decisions', () => {
    const draft = createGovernedContentVersion(baseInput);
    expectGovernanceError(
      () =>
        reviewContentVersion(
          draft,
          evidenceFor(draft, { decision: 'auto_approved' as never }),
          humanAuthorization('review'),
        ),
      CONTENT_GOVERNANCE_ERROR_CODES.INVALID_METADATA,
    );
  });

  it.each([
    { licenseStatus: 'unknown' as const },
    { licenseStatus: 'blocked' as const },
    { licenseStatus: 'expired' as const },
    {
      licenseStatus: 'approved' as const,
      validUntil: '2026-07-17T00:00:00.000Z',
    },
  ])('fails closed for non-publishable rights: %p', (rightsChange) => {
    const approved = approvedVersion({
      ...baseInput,
      rights: { ...baseInput.rights, ...rightsChange },
    });

    expectGovernanceError(
      () =>
        publishContentVersion(approved, {
          authorization: humanAuthorization('publish'),
          now: fixedNow,
        }),
      CONTENT_GOVERNANCE_ERROR_CODES.LICENSE_NOT_PUBLISHABLE,
    );
  });

  it.each([
    { allowedUsageScopes: ['assessment'] as const },
    { allowedAccessTiers: ['public'] as const },
  ])('rejects rights incompatible with the intended delivery: %p', (change) => {
    const approved = approvedVersion({
      ...baseInput,
      rights: { ...baseInput.rights, ...change },
    });

    expectGovernanceError(
      () =>
        publishContentVersion(approved, {
          authorization: humanAuthorization('publish'),
          now: fixedNow,
        }),
      CONTENT_GOVERNANCE_ERROR_CODES.LICENSE_NOT_PUBLISHABLE,
    );
  });

  it('creates a linked draft revision and discards prior review evidence', () => {
    const published = publishContentVersion(approvedVersion(), {
      authorization: humanAuthorization('publish'),
      now: fixedNow,
    });
    const revision = reviseContentVersion(published, {
      versionId: 'version-2',
      checksum: 'sha256:def',
      sourceVersion: 'drive-v2',
      createdByActorId: 'import-job-2',
    });

    expect(revision).toMatchObject({
      contentId: published.contentId,
      versionId: 'version-2',
      previousVersionId: published.versionId,
      reviewStatus: 'draft',
      publishStatus: 'draft',
    });
    expect(revision.reviewEvidence).toBeUndefined();
    expect(published.publishStatus).toBe('published');
    expect(Object.isFrozen(published)).toBe(true);
  });

  it('rejects revisions without changed checksum or source version', () => {
    const version = createGovernedContentVersion(baseInput);
    expectGovernanceError(
      () =>
        reviseContentVersion(version, {
          versionId: 'version-2',
          checksum: version.source.checksum,
          sourceVersion: version.source.sourceVersion,
          createdByActorId: 'editor-2',
        }),
      CONTENT_GOVERNANCE_ERROR_CODES.REVISION_EVIDENCE_UNCHANGED,
    );
  });

  it.each([
    {
      checksum: 'sha256:changed',
      sourceVersion: baseInput.source.sourceVersion,
    },
    { checksum: baseInput.source.checksum, sourceVersion: 'drive-v2' },
  ])('accepts a revision when one source identity changes: %p', (change) => {
    const version = createGovernedContentVersion(baseInput);
    const revision = reviseContentVersion(version, {
      versionId: 'version-2',
      createdByActorId: 'editor-2',
      ...change,
    });

    expect(revision).toMatchObject({
      previousVersionId: version.versionId,
      reviewStatus: 'draft',
      source: change,
    });
  });

  it('requires a distinct version ID for revisions', () => {
    const version = createGovernedContentVersion(baseInput);
    expectGovernanceError(
      () =>
        reviseContentVersion(version, {
          versionId: version.versionId,
          checksum: 'sha256:changed',
          sourceVersion: 'drive-v2',
          createdByActorId: 'editor-2',
        }),
      CONTENT_GOVERNANCE_ERROR_CODES.INVALID_METADATA,
    );
  });

  it('does not allow a published version to be reviewed or republished', () => {
    const published = publishContentVersion(approvedVersion(), {
      authorization: humanAuthorization('publish'),
      now: fixedNow,
    });

    for (const transition of [
      () =>
        reviewContentVersion(
          published,
          evidenceFor(published),
          humanAuthorization('review'),
        ),
      () =>
        publishContentVersion(published, {
          authorization: humanAuthorization('publish'),
          now: fixedNow,
        }),
    ]) {
      expectGovernanceError(
        transition,
        CONTENT_GOVERNANCE_ERROR_CODES.INVALID_TRANSITION,
      );
    }
  });

  it('uses sanitized failures without source URLs or reviewer evidence', () => {
    const draft = createGovernedContentVersion(baseInput);
    try {
      publishContentVersion(draft, {
        authorization: humanAuthorization('publish'),
        now: fixedNow,
      });
      fail('Expected publication to fail.');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(ContentGovernanceError);
      expect(String(error)).not.toContain(
        baseInput.source.sourceUrl ?? 'source',
      );
      expect(String(error)).not.toContain('publisher-1');
    }
  });

  it.each([
    () => reviewContentVersion(null as never, null as never, null as never),
    () =>
      reviewContentVersion(
        createGovernedContentVersion(baseInput),
        null as never,
        humanAuthorization('review'),
      ),
    () => publishContentVersion(null as never, null as never),
    () =>
      publishContentVersion(approvedVersion(), {
        authorization: humanAuthorization('publish'),
        now: 'not-a-clock' as never,
      }),
    () => reviseContentVersion(null as never, null as never),
    () =>
      reviseContentVersion(createGovernedContentVersion(baseInput), {
        versionId: 2,
        checksum: null,
        sourceVersion: false,
        createdByActorId: 'editor-2',
      } as never),
  ])('returns typed failures for malformed transition input', (operation) => {
    expect(() => operation()).toThrow(ContentGovernanceError);
  });
});
