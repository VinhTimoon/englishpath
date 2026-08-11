import { ToeicPart } from '../../../generated/prisma/enums';
import { assembleFullMockTest } from './full-mock-test.assembler';
import {
  FULL_MOCK_POLICY,
  validateFullMockPolicy,
} from './full-mock-test.policy';

const q = (part: ToeicPart, n: number, version = 1) => ({
  canonicalQuestionId: `${part}-${n}`,
  versionId: `${part}-${n}-v${version}`,
  version,
  part,
});
const catalogue = Object.entries(FULL_MOCK_POLICY.partQuotas).flatMap(
  ([part, count]) =>
    Array.from({ length: count }, (_, i) => q(part as ToeicPart, i + 1)),
);

describe('full mock policy and assembly', () => {
  it('validates the frozen 200-question blueprint', () => {
    expect(FULL_MOCK_POLICY.total).toBe(200);
    expect(Object.isFrozen(FULL_MOCK_POLICY.partQuotas)).toBe(true);
    expect(() => validateFullMockPolicy(FULL_MOCK_POLICY)).not.toThrow();
  });
  it('assembles exact quotas deterministically and deduplicates versions', () => {
    const result = assembleFullMockTest([
      ...catalogue,
      q(ToeicPart.PART_1, 1, 2),
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.assembly.selectedVersionIds).toHaveLength(200);
      expect(result.assembly.selectedVersionIds).toContain('PART_1-1-v2');
      expect(result.assembly.partCounts[ToeicPart.PART_7]).toBe(54);
    }
  });
  it('fails atomically with missing Part evidence', () => {
    const result = assembleFullMockTest(catalogue.slice(1));
    expect(result).toMatchObject({ ok: false, code: 'INSUFFICIENT_CATALOGUE' });
  });
  it('rejects duplicate identities and malformed records', () => {
    expect(
      assembleFullMockTest([q(ToeicPart.PART_1, 1), q(ToeicPart.PART_1, 1)]),
    ).toMatchObject({ code: 'MALFORMED_CATALOGUE' });
    expect(
      assembleFullMockTest([{ ...q(ToeicPart.PART_1, 1), version: 0 }]),
    ).toMatchObject({ code: 'MALFORMED_CATALOGUE' });
  });
  it('does not expose private fields', () => {
    const result = assembleFullMockTest(catalogue);
    expect(result.ok && Object.keys(result.assembly)).toEqual([
      'blueprintVersion',
      'total',
      'durationSeconds',
      'selectedVersionIds',
      'partCounts',
    ]);
  });
});
