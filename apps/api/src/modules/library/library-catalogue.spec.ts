import type { GovernedContentVersion } from '../content-governance/content-governance.models';
import { LibraryCatalogueService } from './library-catalogue.service';
import type { LibraryCatalogueRecord } from './library-catalogue.port';

function version(
  id: string,
  changes: Partial<GovernedContentVersion> = {},
): GovernedContentVersion {
  return {
    contentId: `content-${id}`,
    versionId: `version-${id}`,
    createdByActorId: 'editor-1',
    provenance: 'imported',
    usageScope: 'library',
    accessTier: 'authenticated',
    taxonomy: {
      level: id === 'two' ? 'B2' : 'B1',
      topic: id === 'two' ? 'Travel' : 'Workplace',
      collocations: [],
      relatedSkills: ['Listening'],
      tracks: ['general'],
      toeicParts: [],
    },
    source: {
      sourceId: 'englishpath-original',
      checksum: `checksum-${id}`,
      sourceVersion: `source-${id}`,
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

function record(id: string, changes: Partial<GovernedContentVersion> = {}) {
  return {
    version: version(id, changes),
    title: id === 'two' ? 'Travel dialogue' : 'Workplace dialogue',
    summary:
      id === 'two' ? 'A travel listening lesson' : 'A work listening lesson',
    contentType: 'listening',
    durationMinutes: 8,
  } satisfies LibraryCatalogueRecord;
}

describe('LibraryCatalogueService', () => {
  it('filters before facets, orders deterministically, paginates, and redacts source data', async () => {
    const service = new LibraryCatalogueService({
      load: jest
        .fn()
        .mockResolvedValue([
          record('two'),
          record('private', { accessTier: 'public' }),
          record('draft', { reviewStatus: 'draft' }),
          record('one'),
        ]),
    });

    const result = await service.query({ page: 1, size: 1 });

    expect(result.status).toBe('success');
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      itemId: 'content-two',
      title: 'Travel dialogue',
      taxonomy: { level: 'B2', topic: 'Travel' },
    });
    expect(result.pagination).toEqual({ page: 1, size: 1, total: 2, pages: 2 });
    expect(result.facets).toEqual({
      levels: ['B1', 'B2'],
      topics: ['Travel', 'Workplace'],
      contentTypes: ['listening'],
    });
    expect(JSON.stringify(result)).not.toContain('checksum');
    expect(JSON.stringify(result)).not.toContain('englishpath-original');
    expect(JSON.stringify(result)).not.toContain('createdByActorId');
  });

  it('supports server-derived filters and distinguishes filtered empty from empty', async () => {
    const port = { load: jest.fn().mockResolvedValue([record('one')]) };
    const service = new LibraryCatalogueService(port);

    await expect(
      service.query({ page: 1, size: 12, topic: 'Travel' }),
    ).rejects.toThrow('Unsupported catalogue topic filter');
    await expect(
      service.query({ page: 1, size: 12, search: 'missing' }),
    ).resolves.toMatchObject({ status: 'filtered-empty', items: [] });
    await expect(
      new LibraryCatalogueService({
        load: jest.fn().mockResolvedValue([]),
      }).query({ page: 1, size: 12 }),
    ).resolves.toMatchObject({ status: 'empty', items: [] });
  });

  it('fails with a retryable service error when the adapter is unavailable', async () => {
    const service = new LibraryCatalogueService({
      load: jest.fn().mockRejectedValue(new Error('private provider detail')),
    });

    await expect(service.query({ page: 1, size: 12 })).rejects.toThrow(
      'Library catalogue unavailable',
    );
  });
});
