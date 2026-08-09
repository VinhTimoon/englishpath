import {
  createDriveInventoryResult,
  type DriveInventoryManifest,
  type DriveInventorySnapshotComparison,
  type DriveInventorySnapshotRecord,
} from './drive-inventory.models';

type Evidence = Readonly<{
  reviewStatus: 'DRAFT' | 'PRESERVED';
  publicationState: 'UNPUBLISHED' | 'PRESERVED';
}>;

const RESET_EVIDENCE: Evidence = Object.freeze({
  reviewStatus: 'DRAFT',
  publicationState: 'UNPUBLISHED',
});
const PRESERVED_EVIDENCE: Evidence = Object.freeze({
  reviewStatus: 'PRESERVED',
  publicationState: 'PRESERVED',
});

function identity(manifest: DriveInventoryManifest) {
  return `${manifest.provider}::${manifest.sourceFileId}`;
}

export function compareDriveInventorySnapshots(
  previous: readonly DriveInventoryManifest[],
  current: readonly DriveInventoryManifest[],
  options: Readonly<{ complete: boolean }> = { complete: true },
): DriveInventorySnapshotComparison {
  if (!options.complete) {
    return Object.freeze({ complete: false, records: Object.freeze([]) });
  }

  const previousResult = createDriveInventoryResult({ manifests: previous });
  const currentResult = createDriveInventoryResult({ manifests: current });
  const oldByIdentity = new Map(
    previousResult.manifests.map((item) => [identity(item), item]),
  );
  const currentIds = new Set(currentResult.manifests.map(identity));
  const records: DriveInventorySnapshotRecord[] = currentResult.manifests.map(
    (manifest) => {
      const old = oldByIdentity.get(identity(manifest));
      const change = !old
        ? 'new'
        : old.checksum === manifest.checksum &&
            old.sourceVersion === manifest.sourceVersion
          ? 'unchanged'
          : 'changed';
      return Object.freeze({
        change,
        manifest,
        evidence: change === 'unchanged' ? PRESERVED_EVIDENCE : RESET_EVIDENCE,
      });
    },
  );

  previousResult.manifests.forEach((manifest) => {
    if (!currentIds.has(identity(manifest))) {
      records.push(
        Object.freeze({
          change: 'removed',
          manifest,
          evidence: RESET_EVIDENCE,
        }),
      );
    }
  });

  return Object.freeze({ complete: true, records: Object.freeze(records) });
}
