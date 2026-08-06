import { ToeicPart } from '../../generated/prisma/enums';

export type TimedTestMode = 'MINI' | 'HALF';
export type TimedTestStatus = 'ACTIVE' | 'SUBMITTED' | 'EXPIRED';

export const TOEIC_TIMED_TEST_POLICY_VERSION = 'v1';

export type TimedTestPolicy = Readonly<{
  total: number;
  durationSeconds: number;
  listening: number;
  reading: number;
  quotas: Readonly<Record<ToeicPart, number>>;
}>;

const MINI_POLICY: TimedTestPolicy = Object.freeze({
  total: 20,
  durationSeconds: 20 * 60,
  listening: 10,
  reading: 10,
  quotas: Object.freeze({
    [ToeicPart.PART_1]: 1,
    [ToeicPart.PART_2]: 2,
    [ToeicPart.PART_3]: 4,
    [ToeicPart.PART_4]: 3,
    [ToeicPart.PART_5]: 3,
    [ToeicPart.PART_6]: 2,
    [ToeicPart.PART_7]: 5,
  }),
});

const HALF_POLICY: TimedTestPolicy = Object.freeze({
  total: 50,
  durationSeconds: 45 * 60,
  listening: 25,
  reading: 25,
  quotas: Object.freeze({
    [ToeicPart.PART_1]: 2,
    [ToeicPart.PART_2]: 6,
    [ToeicPart.PART_3]: 10,
    [ToeicPart.PART_4]: 7,
    [ToeicPart.PART_5]: 8,
    [ToeicPart.PART_6]: 4,
    [ToeicPart.PART_7]: 13,
  }),
});

export const TOEIC_TIMED_TEST_POLICIES: Readonly<
  Record<TimedTestMode, TimedTestPolicy>
> = Object.freeze({ MINI: MINI_POLICY, HALF: HALF_POLICY });

export function timedTestPolicy(mode: TimedTestMode): TimedTestPolicy {
  return TOEIC_TIMED_TEST_POLICIES[mode];
}
