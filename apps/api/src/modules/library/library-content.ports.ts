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

export const LIBRARY_STORAGE_STATES = [
  'PENDING',
  'AVAILABLE',
  'QUARANTINED',
  'RETIRED',
] as const;

function normalizeStorageReference(
  reference: unknown,
): ControlledStorageReference {
  if (!reference || typeof reference !== 'object' || Array.isArray(reference)) {
    throw new Error('INVALID_STORAGE_REFERENCE');
  }

  const candidate = reference as Record<string, unknown>;
  if (
    typeof candidate.provider !== 'string' ||
    typeof candidate.objectKey !== 'string' ||
    !candidate.provider.trim() ||
    !candidate.objectKey.trim() ||
    !LIBRARY_STORAGE_STATES.includes(
      candidate.state as (typeof LIBRARY_STORAGE_STATES)[number],
    )
  ) {
    throw new Error('INVALID_STORAGE_REFERENCE');
  }

  return {
    provider: candidate.provider.trim(),
    objectKey: candidate.objectKey.trim(),
    state: candidate.state as ControlledStorageReference['state'],
  };
}

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
  reference: unknown,
): LearnerSafeStorageReference {
  const normalized = normalizeStorageReference(reference);
  return Object.freeze({ state: normalized.state });
}

export class DeterministicLocalStorageAdapter implements ControlledStoragePort {
  attach(
    reference: ControlledStorageReference,
  ): Promise<LearnerSafeStorageReference> {
    return Promise.resolve().then(() => redactStorageReference(reference));
  }
}
