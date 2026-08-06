import { ToeicPart } from '../../generated/prisma/enums';
export type TimedTestMode = 'MINI' | 'HALF';
export const TOEIC_TIMED_TEST_POLICY_VERSION = 'v1';
export const TOEIC_TIMED_TEST_POLICIES = Object.freeze({
  MINI: Object.freeze({
    total: 20,
    durationSeconds: 1200,
    listening: 10,
    reading: 10,
    quotas: Object.freeze({
      PART_1: 1,
      PART_2: 2,
      PART_3: 4,
      PART_4: 3,
      PART_5: 3,
      PART_6: 2,
      PART_7: 5,
    }),
  }),
  HALF: Object.freeze({
    total: 50,
    durationSeconds: 2700,
    listening: 25,
    reading: 25,
    quotas: Object.freeze({
      PART_1: 2,
      PART_2: 6,
      PART_3: 10,
      PART_4: 7,
      PART_5: 8,
      PART_6: 4,
      PART_7: 13,
    }),
  }),
});
export function timedTestPolicy(mode: TimedTestMode) {
  return TOEIC_TIMED_TEST_POLICIES[mode];
}
export const TOEIC_TIMED_PARTS = Object.values(ToeicPart);
