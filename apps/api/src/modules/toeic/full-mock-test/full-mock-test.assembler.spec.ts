import { ToeicPart } from '../../../generated/prisma/enums';
import { assembleFullMockTest } from './full-mock-test.assembler';
import {
  FULL_MOCK_POLICY,
  FullMockPolicyError,
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
    expect(FULL_MOCK_POLICY.durationSeconds).toBe(7200);
    expect(FULL_MOCK_POLICY.listeningTotal).toBe(100);
    expect(FULL_MOCK_POLICY.readingTotal).toBe(100);
    expect(FULL_MOCK_POLICY.partQuotas).toEqual({
      [ToeicPart.PART_1]: 6,
      [ToeicPart.PART_2]: 25,
      [ToeicPart.PART_3]: 39,
      [ToeicPart.PART_4]: 30,
      [ToeicPart.PART_5]: 30,
      [ToeicPart.PART_6]: 16,
      [ToeicPart.PART_7]: 54,
    });
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
    expect(
      assembleFullMockTest([
        q(ToeicPart.PART_1, 1),
        { ...q(ToeicPart.PART_1, 2), versionId: 'PART_1-1-v1' },
      ]),
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

  it('freezes nested output snapshots', () => {
    const result = assembleFullMockTest(catalogue);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.isFrozen(result.assembly)).toBe(true);
      expect(Object.isFrozen(result.assembly.selectedVersionIds)).toBe(true);
      expect(Object.isFrozen(result.assembly.partCounts)).toBe(true);
    }
  });

  it('rejects a policy with a missing Part quota', () => {
    const invalid = {
      ...FULL_MOCK_POLICY,
      partQuotas: {
        ...FULL_MOCK_POLICY.partQuotas,
        [ToeicPart.PART_7]: undefined as never,
      },
    };
    expect(assembleFullMockTest(catalogue, invalid)).toMatchObject({
      ok: false,
      code: 'MALFORMED_CATALOGUE',
    });
    expect(() =>
      validateFullMockPolicy({
        ...FULL_MOCK_POLICY,
        listeningTotal: 99,
      }),
    ).toThrow(FullMockPolicyError);
  });

  it('rejects malformed runtime policy and catalogue values with typed results', () => {
    expect(() => validateFullMockPolicy(null as never)).toThrow(
      FullMockPolicyError,
    );
    expect(assembleFullMockTest(null as never)).toMatchObject({
      ok: false,
      code: 'MALFORMED_CATALOGUE',
    });
    expect(assembleFullMockTest([null as never])).toMatchObject({
      ok: false,
      code: 'MALFORMED_CATALOGUE',
    });
  });

  it('rejects a canonical question that appears in two Parts', () => {
    expect(
      assembleFullMockTest([
        q(ToeicPart.PART_1, 1),
        { ...q(ToeicPart.PART_2, 1), canonicalQuestionId: 'PART_1-1' },
      ]),
    ).toMatchObject({ ok: false, code: 'MALFORMED_CATALOGUE' });
  });

  it('orders selected versions by Part and canonical question identity', () => {
    const result = assembleFullMockTest([
      ...catalogue,
      q(ToeicPart.PART_1, 1, 2),
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.assembly.selectedVersionIds.slice(0, 6)).toEqual([
        'PART_1-1-v2',
        'PART_1-2-v1',
        'PART_1-3-v1',
        'PART_1-4-v1',
        'PART_1-5-v1',
        'PART_1-6-v1',
      ]);
    }
  });
});
