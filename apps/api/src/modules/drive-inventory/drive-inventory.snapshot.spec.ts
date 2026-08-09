import { compareDriveInventorySnapshots } from './drive-inventory.snapshot';
import type { DriveInventoryManifest } from './drive-inventory.models';

const manifest = (
  id: string,
  checksum = 'sha256:a',
  version = 'v1',
): DriveInventoryManifest => ({
  provider: 'fixture',
  sourceFileId: id,
  displayName: id,
  mimeType: 'application/pdf',
  resourceKind: 'document',
  privateSourceRef: `fixture://${id}`,
  checksum,
  sourceVersion: version,
  modifiedAt: '2026-07-17T00:00:00.000Z',
  inventoriedAt: '2026-07-17T01:00:00.000Z',
  sizeBytes: 1,
});

describe('drive inventory snapshot comparison', () => {
  it('classifies all changes deterministically and resets changed evidence', () => {
    const result = compareDriveInventorySnapshots(
      [manifest('same'), manifest('changed'), manifest('removed')],
      [manifest('same'), manifest('changed', 'sha256:b'), manifest('new')],
    );
    expect(
      result.records.map((record) => [
        record.manifest.sourceFileId,
        record.change,
      ]),
    ).toEqual([
      ['changed', 'changed'],
      ['new', 'new'],
      ['same', 'unchanged'],
      ['removed', 'removed'],
    ]);
    expect(
      result.records.find((record) => record.manifest.sourceFileId === 'same')
        ?.evidence.reviewStatus,
    ).toBe('PRESERVED');
    expect(
      result.records.find(
        (record) => record.manifest.sourceFileId === 'changed',
      )?.evidence,
    ).toEqual({ reviewStatus: 'DRAFT', publicationState: 'UNPUBLISHED' });
  });

  it('does not classify removals from an incomplete scan', () => {
    const result = compareDriveInventorySnapshots([manifest('old')], [], {
      complete: false,
    });
    expect(result.complete).toBe(false);
    expect(result.records).toEqual([]);
  });

  it('classifies a source-version-only change and preserves no old evidence', () => {
    const result = compareDriveInventorySnapshots(
      [manifest('versioned', 'sha256:a', 'v1')],
      [manifest('versioned', 'sha256:a', 'v2')],
    );
    expect(result.records[0]).toMatchObject({
      change: 'changed',
      evidence: { reviewStatus: 'DRAFT', publicationState: 'UNPUBLISHED' },
    });
  });

  it('is idempotent when input order changes', () => {
    const previous = [manifest('b'), manifest('a')];
    const current = [manifest('c'), manifest('a')];
    expect(compareDriveInventorySnapshots(previous, current)).toEqual(
      compareDriveInventorySnapshots(
        [...previous].reverse(),
        [...current].reverse(),
      ),
    );
  });
});
