import {
  DRIVE_INVENTORY_ERROR_CODES,
  DriveInventoryError,
} from './drive-inventory.error';
import {
  createDriveInventoryManifest,
  createDriveInventoryQuery,
  createDriveInventoryResult,
  DRIVE_INVENTORY_RESOURCE_KINDS,
  type DriveInventoryManifest,
} from './drive-inventory.models';
import * as driveInventoryPublicApi from './index';

function createBaseManifest(
  overrides: Partial<DriveInventoryManifest> = {},
): DriveInventoryManifest {
  return {
    provider: 'google_drive',
    sourceFileId: 'file-001',
    displayName: ' Lesson Plan ',
    mimeType: 'application/pdf',
    resourceKind: 'document',
    parentSourceIds: [' folder-a ', '', 'folder-b', 'folder-a'],
    pathHints: [' Unit 1 ', '', ' Listening ', 'Unit 1'],
    privateSourceRef: 'drive://private/file-001',
    checksum: 'sha256:abc123',
    sourceVersion: 'version-1',
    modifiedAt: '2026-07-17T00:00:00.000Z',
    sizeBytes: 0,
    inventoriedAt: '2026-07-17T01:00:00.000Z',
    ...overrides,
  };
}

function expectDriveInventoryError(action: () => unknown, code: string) {
  try {
    action();
    fail('Expected drive inventory operation to throw.');
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(DriveInventoryError);
    expect(error).toMatchObject({ code });
  }
}

describe('drive inventory models', () => {
  it('normalizes and deeply freezes manifests', () => {
    const manifest = createDriveInventoryManifest(createBaseManifest());

    expect(manifest).toEqual({
      provider: 'google_drive',
      sourceFileId: 'file-001',
      displayName: 'Lesson Plan',
      mimeType: 'application/pdf',
      resourceKind: 'document',
      parentSourceIds: ['folder-a', 'folder-b'],
      pathHints: ['Unit 1', 'Listening'],
      privateSourceRef: 'drive://private/file-001',
      checksum: 'sha256:abc123',
      sourceVersion: 'version-1',
      modifiedAt: '2026-07-17T00:00:00.000Z',
      sizeBytes: 0,
      inventoriedAt: '2026-07-17T01:00:00.000Z',
    });
    expect(Object.isFrozen(manifest)).toBe(true);
    expect(Object.isFrozen(manifest.parentSourceIds)).toBe(true);
    expect(Object.isFrozen(manifest.pathHints)).toBe(true);
  });

  it.each(
    DRIVE_INVENTORY_RESOURCE_KINDS.map((resourceKind, index) => ({
      resourceKind,
      sourceFileId: `file-${index}`,
      mimeType:
        resourceKind === 'course_folder'
          ? 'application/vnd.google-apps.folder'
          : resourceKind === 'external_link'
            ? 'application/vnd.google-apps.shortcut'
            : 'application/octet-stream',
      sizeBytes:
        resourceKind === 'course_folder' || resourceKind === 'external_link'
          ? undefined
          : index,
    })),
  )('supports resource kind %s', (manifestInput) => {
    const manifest = createDriveInventoryManifest(
      createBaseManifest(manifestInput),
    );
    expect(manifest.resourceKind).toBe(manifestInput.resourceKind);
  });

  it('permits omitted size for folders and external links only', () => {
    expect(
      createDriveInventoryManifest(
        createBaseManifest({
          resourceKind: 'course_folder',
          mimeType: 'application/vnd.google-apps.folder',
          sizeBytes: undefined,
        }),
      ).sizeBytes,
    ).toBeUndefined();

    expect(
      createDriveInventoryManifest(
        createBaseManifest({
          resourceKind: 'external_link',
          mimeType: 'application/vnd.google-apps.shortcut',
          sizeBytes: undefined,
        }),
      ).sizeBytes,
    ).toBeUndefined();

    expectDriveInventoryError(
      () =>
        createDriveInventoryManifest(
          createBaseManifest({ resourceKind: 'image', sizeBytes: undefined }),
        ),
      DRIVE_INVENTORY_ERROR_CODES.INVALID_MANIFEST,
    );
  });

  it.each([-1, 1.5, Number.POSITIVE_INFINITY, Number.NaN])(
    'rejects invalid byte size %p',
    (sizeBytes) => {
      expectDriveInventoryError(
        () =>
          createDriveInventoryManifest(
            createBaseManifest({ sizeBytes: sizeBytes }),
          ),
        DRIVE_INVENTORY_ERROR_CODES.INVALID_MANIFEST,
      );
    },
  );

  it('normalizes queries and rejects unsupported query enum values', () => {
    expect(
      createDriveInventoryQuery({
        provider: ' google_drive ',
        sourceFileIds: [' file-2 ', 'file-1', '', 'file-2'],
        resourceKinds: ['video', 'document', 'video'],
      }),
    ).toEqual({
      provider: 'google_drive',
      sourceFileIds: ['file-2', 'file-1'],
      resourceKinds: ['video', 'document'],
    });

    expectDriveInventoryError(
      () => createDriveInventoryQuery({ resourceKinds: ['invalid'] as never }),
      DRIVE_INVENTORY_ERROR_CODES.INVALID_QUERY,
    );

    for (const query of [{ sourceFileIds: [] }, { resourceKinds: [] }]) {
      expectDriveInventoryError(
        () => createDriveInventoryQuery(query),
        DRIVE_INVENTORY_ERROR_CODES.INVALID_QUERY,
      );
    }

    expectDriveInventoryError(
      () => createDriveInventoryQuery({ pageToken: 'opaque' }),
      DRIVE_INVENTORY_ERROR_CODES.INVALID_QUERY,
    );

    for (const query of [[], null, new Date()]) {
      expectDriveInventoryError(
        () => createDriveInventoryQuery(query as never),
        DRIVE_INVENTORY_ERROR_CODES.INVALID_QUERY,
      );
    }
  });

  it('sorts result manifests deterministically by provider and source file id', () => {
    const result = createDriveInventoryResult({
      query: { provider: 'google_drive' },
      manifests: [
        createBaseManifest({ provider: 'zeta_drive', sourceFileId: 'file-9' }),
        createBaseManifest({ provider: 'alpha_drive', sourceFileId: 'file-2' }),
        createBaseManifest({ provider: 'alpha_drive', sourceFileId: 'file-1' }),
      ],
    });

    expect(
      result.manifests.map(
        (manifest) => `${manifest.provider}/${manifest.sourceFileId}`,
      ),
    ).toEqual([
      'alpha_drive/file-1',
      'alpha_drive/file-2',
      'zeta_drive/file-9',
    ]);
    expect(result.manifestCount).toBe(3);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.query)).toBe(true);
    expect(Object.isFrozen(result.manifests)).toBe(true);
  });

  it('rejects duplicate provider and source file identities', () => {
    expectDriveInventoryError(
      () =>
        createDriveInventoryResult({
          manifests: [
            createBaseManifest({
              provider: 'google_drive',
              sourceFileId: 'dup',
            }),
            createBaseManifest({
              provider: 'google_drive',
              sourceFileId: 'dup',
            }),
          ],
        }),
      DRIVE_INVENTORY_ERROR_CODES.DUPLICATE_MANIFEST,
    );
  });

  it('rejects sparse manifest arrays instead of dropping missing entries', () => {
    expectDriveInventoryError(
      () =>
        createDriveInventoryResult({
          manifests: new Array<DriveInventoryManifest>(1),
        }),
      DRIVE_INVENTORY_ERROR_CODES.INVALID_MANIFEST,
    );
  });

  it.each([
    { provider: ' ' },
    { sourceFileId: 'bad value' },
    { mimeType: 'pdf' },
    { checksum: 'abc123' },
    { sourceVersion: 'bad version' },
    { modifiedAt: 'not-a-date' },
    { inventoriedAt: 'still-not-a-date' },
    { modifiedAt: '2026-02-30T00:00:00.000Z' },
    { modifiedAt: '2026-07-17' },
    { modifiedAt: '2026-07-17T07:00:00+07:00' },
    { parentSourceIds: ['folder-a', 'bad value'] },
    { resourceKind: 'spreadsheet_or_magic' },
  ])('rejects malformed runtime manifest input: %p', (change) => {
    expectDriveInventoryError(
      () =>
        createDriveInventoryManifest({
          ...createBaseManifest(),
          ...change,
        } as never),
      DRIVE_INVENTORY_ERROR_CODES.INVALID_MANIFEST,
    );
  });

  it('returns stable sanitized errors without leaking private metadata', () => {
    const privateSourceRef = 'drive://private/secret-file';
    const pathHint = 'Secret Folder';

    try {
      createDriveInventoryManifest(
        createBaseManifest({
          privateSourceRef,
          pathHints: [pathHint],
          checksum: 'invalid checksum',
        }),
      );
      fail('Expected manifest validation to throw.');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(DriveInventoryError);
      expect(error).toMatchObject({
        code: DRIVE_INVENTORY_ERROR_CODES.INVALID_MANIFEST,
        message: 'Drive inventory manifest is invalid.',
      });
      expect(String(error)).not.toContain(privateSourceRef);
      expect(String(error)).not.toContain(pathHint);
    }
  });

  it('exposes metadata only and omits content or delivery fields', () => {
    const manifest = createDriveInventoryManifest(createBaseManifest());

    expect('contentBytes' in manifest).toBe(false);
    expect('publicDeliveryUrl' in manifest).toBe(false);
    expect('publishStatus' in manifest).toBe(false);
    expect('downloadUrl' in manifest).toBe(false);
    expect('publish' in driveInventoryPublicApi).toBe(false);
    expect('downloadContent' in driveInventoryPublicApi).toBe(false);
  });

  it.each([
    'contentBytes',
    'publicDeliveryUrl',
    'publishStatus',
    'downloadUrl',
  ])(
    'rejects prohibited manifest field %s instead of silently accepting it',
    (field) => {
      expectDriveInventoryError(
        () =>
          createDriveInventoryManifest({
            ...createBaseManifest(),
            [field]: 'prohibited',
          }),
        DRIVE_INVENTORY_ERROR_CODES.INVALID_MANIFEST,
      );
    },
  );

  it('accepts a private operational URL without treating it as public delivery', () => {
    const manifest = createDriveInventoryManifest(
      createBaseManifest({
        privateSourceRef:
          'https://drive.google.com/file/d/private?id=fixture-1',
      }),
    );
    expect(manifest.privateSourceRef).toContain('drive.google.com');
    expect('publicDeliveryUrl' in manifest).toBe(false);
  });

  it('rejects mutation of the complete result graph', () => {
    const result = createDriveInventoryResult({
      query: {
        sourceFileIds: ['file-001'],
        resourceKinds: ['document'],
      },
      manifests: [createBaseManifest()],
    });
    const manifest = result.manifests[0];

    expect(() => {
      (manifest as { displayName: string }).displayName = 'mutated';
    }).toThrow(TypeError);
    expect(() => {
      (manifest.pathHints as string[]).push('mutated');
    }).toThrow(TypeError);
    expect(() => {
      (result.manifests as DriveInventoryManifest[]).push(manifest);
    }).toThrow(TypeError);
    expect(() => {
      (result.query.sourceFileIds as string[]).push('mutated');
    }).toThrow(TypeError);
    expect(() => {
      (result.query.resourceKinds as string[]).push('video');
    }).toThrow(TypeError);
  });
});
