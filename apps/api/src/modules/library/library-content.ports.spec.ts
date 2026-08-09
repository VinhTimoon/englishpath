import {
  DeterministicLocalStorageAdapter,
  LIBRARY_GOVERNANCE_DEFAULTS,
  redactStorageReference,
} from './library-content.ports';

describe('library storage boundary', () => {
  it('defaults governance to deny-by-default', () => {
    expect(LIBRARY_GOVERNANCE_DEFAULTS).toEqual({
      reviewStatus: 'DRAFT',
      publicationState: 'UNPUBLISHED',
      rightsStatus: 'PENDING',
    });
  });

  it('redacts provider and object location from learner-safe output', () => {
    expect(
      redactStorageReference({
        provider: 'local',
        objectKey: 'private/a',
        state: 'AVAILABLE',
      }),
    ).toEqual({ state: 'AVAILABLE' });
  });

  it('returns immutable, deterministic local output', async () => {
    const output = await new DeterministicLocalStorageAdapter().attach({
      provider: 'fixture',
      objectKey: 'object-1',
      state: 'PENDING',
    });
    expect(output).toEqual({ state: 'PENDING' });
    expect(Object.isFrozen(output)).toBe(true);
  });

  it.each([
    undefined,
    { provider: 1, objectKey: 'object-1', state: 'PENDING' },
    { provider: 'fixture', objectKey: '', state: 'PENDING' },
    { provider: 'fixture', objectKey: 'object-1', state: 'UNKNOWN' },
  ])('rejects malformed storage references: %p', async (reference) => {
    await expect(
      new DeterministicLocalStorageAdapter().attach(reference as never),
    ).rejects.toThrow('INVALID_STORAGE_REFERENCE');
  });
});
