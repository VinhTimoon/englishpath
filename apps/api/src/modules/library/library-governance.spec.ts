import {
  CONTENT_GOVERNANCE_ERROR_CODES,
  ContentGovernanceError,
  authorizeHumanContentAction,
  isPublicLearningContentVersion,
  publishContentVersion,
  reviewContentVersion,
  type ContentRights,
  type SharedTaxonomy,
} from '../content-governance';
import { importDriveManifestAsDraft } from './library-governance';

const taxonomy: SharedTaxonomy = {
  level: 'B1',
  topic: 'Listening',
  collocations: ['take notes'],
  relatedSkills: ['Listening'],
  tracks: ['Library'],
  toeicParts: [3],
};
const rights: ContentRights = {
  owner: 'EnglishPath',
  licenseStatus: 'approved',
  allowedUsageScopes: ['library'],
  allowedAccessTiers: ['authenticated'],
  validUntil: '2027-01-01T00:00:00.000Z',
};
const manifest = {
  provider: 'fixture',
  sourceFileId: 'audio-1',
  displayName: 'Listening lesson',
  mimeType: 'audio/mpeg',
  resourceKind: 'audio' as const,
  privateSourceRef: 'drive://private/audio-1',
  checksum: 'sha256:audio1',
  sourceVersion: 'v1',
  modifiedAt: '2026-07-17T00:00:00.000Z',
  sizeBytes: 12,
  inventoriedAt: '2026-07-17T01:00:00.000Z',
};

function authorization(action: 'review' | 'publish', actorId: string) {
  return authorizeHumanContentAction(
    { authorizeHumanAction: () => actorId },
    action,
  );
}

function expectGovernanceError(action: () => unknown, code: string) {
  expect(action).toThrow(ContentGovernanceError);
  try {
    action();
  } catch (error) {
    expect(error).toMatchObject({ code });
  }
}

describe('licensed library governance workflow', () => {
  it('imports only a private-manifest-bound draft and omits its private URL', () => {
    const draft = importDriveManifestAsDraft({
      manifest,
      createdByActorId: 'importer-1',
      taxonomy,
      rights,
      contentId: 'content-1',
      versionId: 'version-1',
    });
    expect(draft).toMatchObject({
      provenance: 'imported',
      usageScope: 'library',
      reviewStatus: 'draft',
      publishStatus: 'draft',
      source: { sourceId: 'fixture:audio-1', checksum: 'sha256:audio1' },
    });
    expect(draft.source).not.toHaveProperty('sourceUrl');
    expect(Object.isFrozen(draft)).toBe(true);
  });

  it('requires exact evidence and separates review from import', () => {
    const draft = importDriveManifestAsDraft({
      manifest,
      createdByActorId: 'importer-1',
      taxonomy,
      rights,
      contentId: 'content-2',
      versionId: 'version-2',
    });
    expectGovernanceError(
      () =>
        reviewContentVersion(
          draft,
          {
            reviewerId: 'importer-1',
            decision: 'approved',
            reviewedAt: '2026-07-17T02:00:00.000Z',
            contentId: draft.contentId,
            versionId: draft.versionId,
            checksum: draft.source.checksum,
            sourceVersion: draft.source.sourceVersion,
          },
          authorization('review', 'importer-1'),
        ),
      CONTENT_GOVERNANCE_ERROR_CODES.SELF_REVIEW_FORBIDDEN,
    );
  });

  it('does not publish an expired reviewed draft', () => {
    const draft = importDriveManifestAsDraft({
      manifest,
      createdByActorId: 'importer-1',
      taxonomy,
      rights,
      contentId: 'content-3',
      versionId: 'version-3',
    });
    const reviewed = reviewContentVersion(
      draft,
      {
        reviewerId: 'reviewer-1',
        decision: 'approved',
        reviewedAt: '2026-07-17T02:00:00.000Z',
        contentId: draft.contentId,
        versionId: draft.versionId,
        checksum: draft.source.checksum,
        sourceVersion: draft.source.sourceVersion,
      },
      authorization('review', 'reviewer-1'),
    );
    expect(() =>
      publishContentVersion(reviewed, {
        authorization: authorization('publish', 'publisher-1'),
        now: () => Date.parse('2028-01-01T00:00:00.000Z'),
      }),
    ).toThrow(ContentGovernanceError);
    expect(isPublicLearningContentVersion(reviewed)).toBe(false);
  });

  it('rejects malformed source input before governance state exists', () => {
    expect(() =>
      importDriveManifestAsDraft({
        manifest: { ...manifest, checksum: 'not-a-checksum' },
        createdByActorId: 'importer-1',
        taxonomy,
        rights,
        contentId: 'content-4',
        versionId: 'version-4',
      }),
    ).toThrow('Drive inventory manifest is invalid.');
  });
});
