import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { GovernedContentVersion } from '../content-governance/content-governance.models';
import { LibraryCatalogueService } from './library-catalogue.service';
import type { LibraryCatalogueRecord } from './library-catalogue.port';
import type {
  ControlledMediaPort,
  ControlledStorageReference,
} from './library-content.ports';

function version(
  changes: Partial<GovernedContentVersion> = {},
): GovernedContentVersion {
  return {
    contentId: 'content-media',
    versionId: 'version-media',
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
      sourceId: 'private-source',
      sourceUrl: 'https://private.example/drive',
      checksum: 'private-checksum',
      sourceVersion: 'private-version',
    },
    rights: {
      owner: 'private-owner',
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

function storage(
  state: ControlledStorageReference['state'],
): ControlledStorageReference {
  return { provider: 'private-provider', objectKey: 'private-object', state };
}

function record(
  changes: Partial<GovernedContentVersion> = {},
  extra: Partial<LibraryCatalogueRecord> = {},
): LibraryCatalogueRecord {
  return {
    version: version(changes),
    title: 'Workplace dialogue',
    summary: 'A safe lesson',
    contentType: 'listening',
    durationSeconds: 60,
    transcript: [
      { startSeconds: 20, endSeconds: 25, text: 'Second line', order: 2 },
      { startSeconds: 0, endSeconds: 5, text: 'First line', order: 1 },
    ],
    storage: storage('AVAILABLE'),
    ...extra,
  };
}

function service(
  current: LibraryCatalogueRecord = record(),
  media: ControlledMediaPort = {
    resolve: jest.fn().mockResolvedValue({ state: 'AVAILABLE' }),
  },
) {
  return new LibraryCatalogueService(
    { load: jest.fn().mockResolvedValue([current]) },
    media,
  );
}

describe('controlled library media and transcript', () => {
  it('rechecks eligibility, orders transcript segments, and redacts private fields', async () => {
    const result = await service().getItem('version-media');

    expect(result).toMatchObject({
      itemId: 'content-media',
      versionId: 'version-media',
      media: { state: 'AVAILABLE' },
      transcript: [
        { startSeconds: 0, endSeconds: 5, text: 'First line' },
        { startSeconds: 20, endSeconds: 25, text: 'Second line' },
      ],
    });
    expect(JSON.stringify(result)).not.toContain('private-');
    expect(JSON.stringify(result)).not.toContain('https://');
    expect(result.media).not.toHaveProperty('locator');
  });

  it.each(['PENDING', 'QUARANTINED', 'RETIRED'] as const)(
    'maps %s to a non-playable safe state',
    async (state) => {
      const media = { resolve: jest.fn().mockResolvedValue({ state }) };
      const result = await service(
        record({}, { storage: storage(state) }),
        media,
      ).getItem('version-media');
      expect(result.media).toEqual({ state });
      expect(result.media).not.toHaveProperty('locator');
    },
  );

  it('uses the safe unavailable state when a provider fails or returns unknown state', async () => {
    const failed = service(record(), {
      resolve: jest
        .fn()
        .mockRejectedValue(new Error('private provider detail')),
    });
    await expect(failed.getItem('version-media')).resolves.toMatchObject({
      media: { state: 'PENDING' },
    });

    const unknown = service(record(), {
      resolve: jest.fn().mockResolvedValue({ state: 'UNKNOWN' }),
    });
    await expect(unknown.getItem('version-media')).resolves.toMatchObject({
      media: { state: 'QUARANTINED' },
    });
  });

  it('makes unknown and ineligible versions indistinguishable', async () => {
    await expect(service().getItem('missing-version')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      service(record({ publishStatus: 'draft' })).getItem('version-media'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects malformed or out-of-range transcript data', async () => {
    await expect(
      service(
        record(
          {},
          { transcript: [{ startSeconds: 5, endSeconds: 2, text: 'bad' }] },
        ),
      ).getItem('version-media'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service(
        record(
          {},
          {
            transcript: [{ startSeconds: 0, endSeconds: 61, text: 'too long' }],
          },
        ),
      ).getItem('version-media'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
