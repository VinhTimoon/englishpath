import {
  authorizeHumanContentAction,
  importReviewedSourceManifestBatch,
  type CreateContentVersionInput,
  type ReviewedSourceManifestImport,
} from '../content-governance';
import type { LibraryCatalogueRecord } from './library-catalogue.port';

const NOW = Date.parse('2026-08-10T00:00:00.000Z');

const taxonomy = {
  level: 'B1',
  topic: 'Workplace',
  subtopic: 'Meetings',
  collocations: ['take notes'],
  relatedSkills: ['Listening', 'Speaking'],
  tracks: ['Daily English'],
  toeicParts: [2, 3],
} as const;

const input: Omit<
  CreateContentVersionInput,
  'contentId' | 'versionId' | 'source'
> = {
  createdByActorId: 'local-reviewed-batch-import',
  provenance: 'imported',
  usageScope: 'library',
  accessTier: 'authenticated',
  taxonomy,
  rights: {
    owner: 'EnglishPath approved local fixture',
    licenseStatus: 'approved',
    allowedUsageScopes: ['library'],
    allowedAccessTiers: ['authenticated'],
    validUntil: '2027-08-10T00:00:00.000Z',
  },
};

function authorization(action: 'review' | 'publish', actorId: string) {
  return authorizeHumanContentAction(
    { authorizeHumanAction: () => actorId },
    action,
  );
}

function entry(
  contentId: string,
  versionId: string,
  sourceId: string,
  checksum: string,
  sourceVersion: string,
): ReviewedSourceManifestImport {
  const reviewAuthorization = authorization('review', 'local-reviewer');
  return {
    manifest: {
      contentId,
      versionId,
      sourceId,
      checksum,
      sourceVersion,
      validated: true,
    },
    input,
    reviewAuthorization,
    publishAuthorization: authorization('publish', 'local-publisher'),
    reviewEvidence: {
      reviewerId: reviewAuthorization.actorId,
      decision: 'approved',
      reviewedAt: '2026-08-09T12:00:00.000Z',
      contentId,
      versionId,
      checksum,
      sourceVersion,
    },
  };
}

export const REVIEWED_LIBRARY_BATCH = Object.freeze([
  entry(
    'licensed-listening-1',
    'licensed-listening-1-v1',
    'local-reviewed-audio-1',
    'sha256:licensed-listening-1',
    'reviewed-v1',
  ),
  entry(
    'licensed-listening-2',
    'licensed-listening-2-v1',
    'local-reviewed-audio-2',
    'sha256:licensed-listening-2',
    'reviewed-v1',
  ),
]);

export function loadReviewedLibraryBatch(): readonly LibraryCatalogueRecord[] {
  const versions = importReviewedSourceManifestBatch(REVIEWED_LIBRARY_BATCH, {
    now: () => NOW,
  });
  return Object.freeze(
    versions.map((version, index) => ({
      version,
      title:
        index === 0 ? 'A focused workplace meeting' : 'Planning a team call',
      summary:
        index === 0
          ? 'Practice listening for decisions and action items.'
          : 'Practice listening for scheduling and next steps.',
      contentType: 'listening',
      durationMinutes: 6,
      durationSeconds: 360,
      transcript: [
        {
          startSeconds: 0,
          endSeconds: 12,
          text:
            index === 0
              ? 'Let us capture the action items before we close.'
              : 'Let us confirm the time for our next team call.',
        },
      ],
      storage: {
        provider: 'local-controlled-media',
        objectKey: `approved/${version.versionId}/audio.mp3`,
        state: 'AVAILABLE',
      },
    })),
  );
}
