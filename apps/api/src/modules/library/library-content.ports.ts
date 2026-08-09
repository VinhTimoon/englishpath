export type LibraryGovernanceDefaults = Readonly<{
  reviewStatus: 'DRAFT';
  publicationState: 'UNPUBLISHED';
  rightsStatus: 'PENDING';
}>;

export type ControlledStorageReference = Readonly<{
  provider: string;
  objectKey: string;
  state: 'PENDING' | 'AVAILABLE' | 'QUARANTINED' | 'RETIRED';
}>;

export type LearnerSafeStorageReference = Readonly<{
  state: ControlledStorageReference['state'];
}>;

export interface ControlledStoragePort {
  attach(
    reference: ControlledStorageReference,
  ): Promise<LearnerSafeStorageReference>;
}

export const LIBRARY_GOVERNANCE_DEFAULTS: LibraryGovernanceDefaults =
  Object.freeze({
    reviewStatus: 'DRAFT',
    publicationState: 'UNPUBLISHED',
    rightsStatus: 'PENDING',
  });

export function redactStorageReference(
  reference: ControlledStorageReference,
): LearnerSafeStorageReference {
  return Object.freeze({ state: reference.state });
}

export class DeterministicLocalStorageAdapter implements ControlledStoragePort {
  attach(
    reference: ControlledStorageReference,
  ): Promise<LearnerSafeStorageReference> {
    if (
      !reference ||
      !reference.provider.trim() ||
      !reference.objectKey.trim()
    ) {
      throw new Error('INVALID_STORAGE_REFERENCE');
    }
    return Promise.resolve(redactStorageReference({ ...reference }));
  }
}
