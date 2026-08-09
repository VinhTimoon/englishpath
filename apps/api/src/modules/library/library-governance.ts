import {
  createDriveInventoryManifest,
  type DriveInventoryManifest,
} from '../drive-inventory/drive-inventory.models';
import {
  createGovernedContentVersion,
  type ContentRights,
  type GovernedContentVersion,
  type SharedTaxonomy,
} from '../content-governance/content-governance.models';

export type LibraryManifestDraftInput = Readonly<{
  manifest: DriveInventoryManifest & Record<string, unknown>;
  createdByActorId: string;
  taxonomy: SharedTaxonomy;
  rights: ContentRights;
  contentId: string;
  versionId: string;
}>;

/** Converts private inventory evidence into a governed, unpublished draft. */
export function importDriveManifestAsDraft(
  input: LibraryManifestDraftInput,
): GovernedContentVersion {
  const manifest = createDriveInventoryManifest(input.manifest);
  return createGovernedContentVersion({
    contentId: input.contentId,
    versionId: input.versionId,
    createdByActorId: input.createdByActorId,
    provenance: 'imported',
    usageScope: 'library',
    accessTier: 'authenticated',
    taxonomy: input.taxonomy,
    source: {
      sourceId: `${manifest.provider}:${manifest.sourceFileId}`,
      checksum: manifest.checksum,
      sourceVersion: manifest.sourceVersion,
    },
    rights: input.rights,
  });
}
