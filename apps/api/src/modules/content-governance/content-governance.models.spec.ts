import {
  CONTENT_GOVERNANCE_ERROR_CODES,
  ContentGovernanceError,
  type ContentGovernanceErrorCode,
} from './content-governance.error';
import {
  createGovernedContentVersion,
  createSharedTaxonomy,
  type CreateContentVersionInput,
} from './content-governance.models';
import * as contentGovernancePublicApi from './index';

export const baseInput: CreateContentVersionInput = {
  contentId: 'content-1',
  versionId: 'version-1',
  createdByActorId: 'import-job-1',
  provenance: 'imported',
  usageScope: 'learning',
  accessTier: 'authenticated',
  taxonomy: {
    level: ' B1 ',
    topic: ' Workplace ',
    subtopic: ' Meetings ',
    collocations: ['take notes', ' Take Notes ', '', 'follow up'],
    relatedSkills: ['Listening', ' listening ', 'Speaking'],
    tracks: ['Daily English', 'TOEIC', ' daily english '],
    toeicParts: [3, 2, 3],
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

describe('content governance models', () => {
  it('normalizes every shared taxonomy dimension deterministically', () => {
    expect(createSharedTaxonomy(baseInput.taxonomy)).toEqual({
      level: 'B1',
      topic: 'Workplace',
      subtopic: 'Meetings',
      collocations: ['take notes', 'follow up'],
      relatedSkills: ['Listening', 'Speaking'],
      tracks: ['Daily English', 'TOEIC'],
      toeicParts: [2, 3],
    });
  });

  it.each([
    { ...baseInput.taxonomy, level: ' ' },
    { ...baseInput.taxonomy, topic: '' },
    { ...baseInput.taxonomy, toeicParts: [0] },
    { ...baseInput.taxonomy, toeicParts: [8] },
    { ...baseInput.taxonomy, toeicParts: [1.5] },
  ])('rejects invalid required taxonomy: %p', (taxonomy) => {
    expectGovernanceError(
      () => createSharedTaxonomy(taxonomy),
      CONTENT_GOVERNANCE_ERROR_CODES.INVALID_TAXONOMY,
    );
  });

  it('creates a deeply frozen draft with complete provenance and rights metadata', () => {
    const version = createGovernedContentVersion(baseInput);

    expect(version).toMatchObject({
      contentId: 'content-1',
      versionId: 'version-1',
      provenance: 'imported',
      reviewStatus: 'draft',
      publishStatus: 'draft',
    });
    expect(version.reviewEvidence).toBeUndefined();
    expect(Object.isFrozen(version)).toBe(true);
    expect(Object.isFrozen(version.taxonomy)).toBe(true);
    expect(Object.isFrozen(version.taxonomy.tracks)).toBe(true);
    expect(Object.isFrozen(version.source)).toBe(true);
    expect(Object.isFrozen(version.rights)).toBe(true);
  });

  it.each([
    { source: { ...baseInput.source, sourceId: '' } },
    { source: { ...baseInput.source, checksum: '' } },
    { source: { ...baseInput.source, sourceVersion: ' ' } },
    { rights: { ...baseInput.rights, owner: '' } },
    { rights: { ...baseInput.rights, validUntil: 'not-a-date' } },
    { rights: { ...baseInput.rights, allowedUsageScopes: [] } },
    { rights: { ...baseInput.rights, allowedAccessTiers: [] } },
  ])('rejects missing or malformed governance metadata: %p', (change) => {
    expect(() =>
      createGovernedContentVersion({ ...baseInput, ...change }),
    ).toThrow(ContentGovernanceError);
  });

  it.each([
    { provenance: 'provider_magic' },
    { usageScope: 'unbounded' },
    { accessTier: 'super_admin' },
    { rights: { ...baseInput.rights, licenseStatus: 'assumed' } },
  ])('rejects invalid runtime enum values: %p', (change) => {
    expectGovernanceError(
      () =>
        createGovernedContentVersion({
          ...baseInput,
          ...change,
        } as never),
      CONTENT_GOVERNANCE_ERROR_CODES.INVALID_METADATA,
    );
  });

  it('does not expose an unchecked lifecycle clone primitive', () => {
    expect('cloneGovernedContentVersion' in contentGovernancePublicApi).toBe(
      false,
    );
  });

  it.each([
    { ...baseInput.taxonomy, level: null },
    { ...baseInput.taxonomy, collocations: null },
    { ...baseInput.taxonomy, relatedSkills: [false] },
    { ...baseInput.taxonomy, toeicParts: '2,3' },
  ])('returns typed errors for malformed runtime taxonomy: %p', (taxonomy) => {
    expect(() => createSharedTaxonomy(taxonomy as never)).toThrow(
      ContentGovernanceError,
    );
  });

  it('returns a typed error for malformed runtime content input', () => {
    expectGovernanceError(
      () => createGovernedContentVersion(null as never),
      CONTENT_GOVERNANCE_ERROR_CODES.INVALID_METADATA,
    );
  });

  it.each([
    { source: null },
    { rights: null },
    { source: { ...baseInput.source, checksum: 7 } },
    { rights: { ...baseInput.rights, validUntil: false } },
  ])('converts malformed nested input to a typed failure: %p', (change) => {
    expectGovernanceError(
      () =>
        createGovernedContentVersion({
          ...baseInput,
          ...change,
        } as never),
      CONTENT_GOVERNANCE_ERROR_CODES.INVALID_METADATA,
    );
  });
});
