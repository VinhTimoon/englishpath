import type { GovernedContentVersion } from '../content-governance/content-governance.models';
import { isEligibleLearnerLibraryVersion } from './library-access-policy';

function version(
  changes: Partial<GovernedContentVersion> = {},
): GovernedContentVersion {
  return {
    contentId: 'content-1',
    versionId: 'version-1',
    createdByActorId: 'editor-1',
    provenance: 'imported',
    usageScope: 'library',
    accessTier: 'authenticated',
    taxonomy: {
      level: 'B1',
      topic: 'Workplace',
      collocations: [],
      relatedSkills: ['Listening'],
      tracks: ['general'],
      toeicParts: [],
    },
    source: {
      sourceId: 'englishpath-original',
      checksum: 'checksum-1',
      sourceVersion: 'version-1',
    },
    rights: {
      owner: 'EnglishPath',
      licenseStatus: 'approved',
      allowedUsageScopes: ['library'],
      allowedAccessTiers: ['authenticated'],
      validUntil: '2027-01-01T00:00:00.000Z',
    },
    reviewStatus: 'approved',
    publishStatus: 'published',
    ...changes,
  };
}

describe('library learner access policy', () => {
  it('allows only a governed, current authenticated library version', () => {
    expect(
      isEligibleLearnerLibraryVersion(
        version(),
        new Date('2026-08-10T00:00:00.000Z'),
      ),
    ).toBe(true);
  });

  it.each([
    ['draft review', { reviewStatus: 'draft' }],
    ['unpublished', { publishStatus: 'draft' }],
    [
      'unlicensed',
      { rights: { ...version().rights, licenseStatus: 'blocked' } },
    ],
    ['wrong scope', { usageScope: 'learning' }],
    ['wrong tier', { accessTier: 'public' }],
    [
      'expired',
      {
        rights: { ...version().rights, validUntil: '2026-01-01T00:00:00.000Z' },
      },
    ],
  ] as const)('rejects %s', (_label, changes) => {
    expect(
      isEligibleLearnerLibraryVersion(
        version(changes as Partial<GovernedContentVersion>),
        new Date('2026-08-10T00:00:00.000Z'),
      ),
    ).toBe(false);
  });

  it('treats an absent expiry as non-expiring and malformed evidence as ineligible', () => {
    expect(
      isEligibleLearnerLibraryVersion(
        version({ rights: { ...version().rights, validUntil: undefined } }),
      ),
    ).toBe(true);
    expect(
      isEligibleLearnerLibraryVersion(
        version({ rights: { ...version().rights, validUntil: 'not-a-date' } }),
      ),
    ).toBe(false);
  });
});
