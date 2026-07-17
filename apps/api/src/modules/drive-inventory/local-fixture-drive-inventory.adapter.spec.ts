import { DRIVE_INVENTORY_ERROR_CODES } from './drive-inventory.error';
import { type DriveInventoryManifest } from './drive-inventory.models';
import { LocalFixtureDriveInventoryAdapter } from './local-fixture-drive-inventory.adapter';

function createFixture(
  overrides: Partial<DriveInventoryManifest> = {},
): DriveInventoryManifest {
  return {
    provider: 'google_drive',
    sourceFileId: 'fixture-1',
    displayName: ' Drive Record ',
    mimeType: 'application/pdf',
    resourceKind: 'document',
    parentSourceIds: [' root ', 'module-1'],
    pathHints: [' Unit 2 ', ' Reading '],
    privateSourceRef: 'drive://private/fixture-1',
    checksum: 'sha256:fixture1',
    sourceVersion: 'fixture-v1',
    modifiedAt: '2026-07-17T00:00:00.000Z',
    sizeBytes: 128,
    inventoriedAt: '2026-07-17T01:00:00.000Z',
    ...overrides,
  };
}

describe('LocalFixtureDriveInventoryAdapter', () => {
  it('returns a stable typed error for malformed fixture options', () => {
    try {
      new LocalFixtureDriveInventoryAdapter(null as never);
      fail('Expected malformed fixture options to throw.');
    } catch (error: unknown) {
      expect(error).toMatchObject({
        code: DRIVE_INVENTORY_ERROR_CODES.INVALID_MANIFEST,
      });
    }
  });

  it('rejects a sparse fixture collection during construction', () => {
    try {
      new LocalFixtureDriveInventoryAdapter({
        fixtures: new Array<DriveInventoryManifest>(1),
      });
      fail('Expected sparse fixture data to throw.');
    } catch (error: unknown) {
      expect(error).toMatchObject({
        code: DRIVE_INVENTORY_ERROR_CODES.INVALID_MANIFEST,
      });
    }
  });

  it('returns normalized immutable copies that do not track later fixture mutation', async () => {
    const fixture = {
      ...createFixture(),
      parentSourceIds: [' parent-a ', 'parent-b'],
      pathHints: [' Module A ', ' Lesson 1 '],
    };
    const adapter = new LocalFixtureDriveInventoryAdapter({
      fixtures: [fixture],
    });

    fixture.displayName = 'Changed Later';
    fixture.parentSourceIds?.push('mutated');
    fixture.pathHints?.push('mutated');

    const result = await adapter.inventory();
    const [manifest] = result.manifests;

    expect(manifest.displayName).toBe('Drive Record');
    expect(manifest.parentSourceIds).toEqual(['parent-a', 'parent-b']);
    expect(manifest.pathHints).toEqual(['Module A', 'Lesson 1']);
    expect(Object.isFrozen(manifest)).toBe(true);
    expect(Object.isFrozen(manifest.parentSourceIds)).toBe(true);
    expect(Object.isFrozen(manifest.pathHints)).toBe(true);
  });

  it('filters deterministically by provider, source file id, and resource kind', async () => {
    const adapter = new LocalFixtureDriveInventoryAdapter({
      fixtures: [
        createFixture({
          provider: 'google_drive',
          sourceFileId: 'b-file',
          resourceKind: 'video',
          mimeType: 'video/mp4',
          sizeBytes: 2048,
        }),
        createFixture({
          provider: 'google_drive',
          sourceFileId: 'a-file',
          resourceKind: 'document',
          mimeType: 'application/pdf',
          sizeBytes: 32,
        }),
        createFixture({
          provider: 'other_drive',
          sourceFileId: 'c-file',
          resourceKind: 'audio',
          mimeType: 'audio/mpeg',
          sizeBytes: 512,
        }),
      ],
    });

    const result = await adapter.inventory({
      provider: ' google_drive ',
      sourceFileIds: [' b-file ', 'a-file'],
      resourceKinds: ['video', 'document'],
    });

    expect(result.query).toEqual({
      provider: 'google_drive',
      sourceFileIds: ['b-file', 'a-file'],
      resourceKinds: ['video', 'document'],
    });
    expect(result.manifests.map((manifest) => manifest.sourceFileId)).toEqual([
      'a-file',
      'b-file',
    ]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.query)).toBe(true);
    expect(Object.isFrozen(result.manifests)).toBe(true);
  });

  it('fails closed on duplicate fixtures before a query can hide them', () => {
    try {
      new LocalFixtureDriveInventoryAdapter({
        fixtures: [
          createFixture({ sourceFileId: 'dup-file' }),
          createFixture({ sourceFileId: 'dup-file' }),
          createFixture({ sourceFileId: 'other-file' }),
        ],
      });
      fail('Expected duplicate fixtures to fail during construction.');
    } catch (error: unknown) {
      expect(error).toMatchObject({
        code: DRIVE_INVENTORY_ERROR_CODES.DUPLICATE_MANIFEST,
        message: 'Drive inventory manifest identity must be unique.',
      });
    }
  });

  it('surfaces sanitized failures for malformed runtime query input', async () => {
    const adapter = new LocalFixtureDriveInventoryAdapter({
      fixtures: [createFixture()],
    });

    await expect(
      adapter.inventory({ resourceKinds: ['unsupported'] as never }),
    ).rejects.toMatchObject({
      code: DRIVE_INVENTORY_ERROR_CODES.INVALID_QUERY,
      message: 'Drive inventory query is invalid.',
    });

    for (const query of [[], null, new Date()]) {
      await expect(adapter.inventory(query as never)).rejects.toMatchObject({
        code: DRIVE_INVENTORY_ERROR_CODES.INVALID_QUERY,
      });
    }
  });
});
