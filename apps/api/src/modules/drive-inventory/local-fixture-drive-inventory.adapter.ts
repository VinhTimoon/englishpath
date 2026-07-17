import type { DriveInventoryPort } from './drive-inventory.port';
import {
  DRIVE_INVENTORY_ERROR_CODES,
  DriveInventoryError,
} from './drive-inventory.error';
import {
  createDriveInventoryQuery,
  createDriveInventoryResult,
  type DriveInventoryManifest,
  type DriveInventoryQuery,
  type DriveInventoryResult,
} from './drive-inventory.models';

export type LocalFixtureDriveInventoryOptions = Readonly<{
  fixtures: readonly (DriveInventoryManifest & Record<string, unknown>)[];
}>;

export class LocalFixtureDriveInventoryAdapter implements DriveInventoryPort {
  private readonly fixtures: readonly DriveInventoryManifest[];

  constructor(options: LocalFixtureDriveInventoryOptions) {
    if (
      !options ||
      typeof options !== 'object' ||
      !Array.isArray(options.fixtures)
    ) {
      throw new DriveInventoryError(
        DRIVE_INVENTORY_ERROR_CODES.INVALID_MANIFEST,
      );
    }
    const fixtureInputs: readonly unknown[] = options.fixtures;
    this.fixtures = createDriveInventoryResult({
      manifests: fixtureInputs as readonly DriveInventoryManifest[],
    }).manifests;
  }

  inventory(query?: DriveInventoryQuery): Promise<DriveInventoryResult> {
    return Promise.resolve().then(() => this.inventorySync(query));
  }

  private inventorySync(query?: DriveInventoryQuery): DriveInventoryResult {
    const normalizedQuery = createDriveInventoryQuery(query);
    const providerFilter = normalizedQuery.provider;
    const sourceFileIdSet = normalizedQuery.sourceFileIds
      ? new Set(normalizedQuery.sourceFileIds)
      : null;
    const resourceKindSet = normalizedQuery.resourceKinds
      ? new Set(normalizedQuery.resourceKinds)
      : null;

    const manifests = this.fixtures.filter((manifest) => {
      if (providerFilter && manifest.provider !== providerFilter) {
        return false;
      }
      if (sourceFileIdSet && !sourceFileIdSet.has(manifest.sourceFileId)) {
        return false;
      }
      if (resourceKindSet && !resourceKindSet.has(manifest.resourceKind)) {
        return false;
      }
      return true;
    });

    return createDriveInventoryResult({
      query: normalizedQuery,
      manifests,
    });
  }
}
