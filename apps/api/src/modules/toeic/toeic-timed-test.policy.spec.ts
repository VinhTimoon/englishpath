import { ToeicPart } from '../../generated/prisma/enums';
import {
  TOEIC_TIMED_TEST_POLICIES,
  TOEIC_TIMED_TEST_POLICY_VERSION,
} from './toeic-timed-test.policy';

describe('TOEIC timed-test policy', () => {
  it('freezes the approved mini and half counts, split, quotas, and durations', () => {
    expect(TOEIC_TIMED_TEST_POLICY_VERSION).toBe('v1');
    expect(TOEIC_TIMED_TEST_POLICIES.MINI).toMatchObject({
      total: 20,
      durationSeconds: 1200,
      listening: 10,
      reading: 10,
      quotas: {
        [ToeicPart.PART_1]: 1,
        [ToeicPart.PART_2]: 2,
        [ToeicPart.PART_3]: 4,
        [ToeicPart.PART_4]: 3,
        [ToeicPart.PART_5]: 3,
        [ToeicPart.PART_6]: 2,
        [ToeicPart.PART_7]: 5,
      },
    });
    expect(TOEIC_TIMED_TEST_POLICIES.HALF).toMatchObject({
      total: 50,
      durationSeconds: 2700,
      listening: 25,
      reading: 25,
      quotas: {
        [ToeicPart.PART_1]: 2,
        [ToeicPart.PART_2]: 6,
        [ToeicPart.PART_3]: 10,
        [ToeicPart.PART_4]: 7,
        [ToeicPart.PART_5]: 8,
        [ToeicPart.PART_6]: 4,
        [ToeicPart.PART_7]: 13,
      },
    });
    for (const policy of Object.values(TOEIC_TIMED_TEST_POLICIES)) {
      expect(
        Object.values(policy.quotas).reduce((sum, value) => sum + value, 0),
      ).toBe(policy.total);
      expect(
        Object.entries(policy.quotas)
          .filter(([part]) =>
            (
              [
                ToeicPart.PART_1,
                ToeicPart.PART_2,
                ToeicPart.PART_3,
                ToeicPart.PART_4,
              ] as readonly ToeicPart[]
            ).includes(part as ToeicPart),
          )
          .reduce((sum, [, value]) => sum + value, 0),
      ).toBe(policy.listening);
      expect(
        Object.entries(policy.quotas)
          .filter(([part]) =>
            (
              [
                ToeicPart.PART_5,
                ToeicPart.PART_6,
                ToeicPart.PART_7,
              ] as readonly ToeicPart[]
            ).includes(part as ToeicPart),
          )
          .reduce((sum, [, value]) => sum + value, 0),
      ).toBe(policy.reading);
      expect(policy.durationSeconds).toBeGreaterThan(0);
    }
  });

  it('freezes the approved FULL policy and version boundary', () => {
    expect(TOEIC_TIMED_TEST_POLICIES.FULL).toMatchObject({
      total: 200,
      durationSeconds: 7200,
      listening: 100,
      reading: 100,
      quotas: {
        [ToeicPart.PART_1]: 6,
        [ToeicPart.PART_2]: 25,
        [ToeicPart.PART_3]: 39,
        [ToeicPart.PART_4]: 30,
        [ToeicPart.PART_5]: 30,
        [ToeicPart.PART_6]: 16,
        [ToeicPart.PART_7]: 54,
      },
    });
    expect(TOEIC_TIMED_TEST_POLICIES.FULL.total).toBe(
      Object.values(TOEIC_TIMED_TEST_POLICIES.FULL.quotas).reduce(
        (sum, value) => sum + value,
        0,
      ),
    );
  });
});
