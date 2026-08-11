import { ToeicPart } from '../../../generated/prisma/enums';

export const FULL_MOCK_POLICY_VERSION = 'FULL-MOCK-BETA-V1' as const;
export const FULL_MOCK_PART_QUOTAS = Object.freeze({
  [ToeicPart.PART_1]: 6,
  [ToeicPart.PART_2]: 25,
  [ToeicPart.PART_3]: 39,
  [ToeicPart.PART_4]: 30,
  [ToeicPart.PART_5]: 30,
  [ToeicPart.PART_6]: 16,
  [ToeicPart.PART_7]: 54,
});

export type FullMockPolicy = Readonly<{
  version: string;
  total: number;
  durationSeconds: number;
  listeningTotal: number;
  readingTotal: number;
  partQuotas: Readonly<Record<ToeicPart, number>>;
}>;

export const FULL_MOCK_POLICY: FullMockPolicy = Object.freeze({
  version: FULL_MOCK_POLICY_VERSION,
  total: 200,
  durationSeconds: 7200,
  listeningTotal: 100,
  readingTotal: 100,
  partQuotas: FULL_MOCK_PART_QUOTAS,
});

export class FullMockPolicyError extends Error {
  readonly code = 'INVALID_FULL_MOCK_POLICY';
  constructor(message: string) {
    super(message);
  }
}

export function validateFullMockPolicy(policy: FullMockPolicy): void {
  if (
    !policy.version ||
    policy.total !== 200 ||
    !Number.isInteger(policy.durationSeconds) ||
    policy.durationSeconds <= 0
  ) {
    throw new FullMockPolicyError(
      'Full-mock version and duration must be valid.',
    );
  }
  const parts = Object.values(policy.partQuotas);
  if (parts.some((quota) => !Number.isInteger(quota) || quota <= 0)) {
    throw new FullMockPolicyError(
      'Every Part quota must be a positive integer.',
    );
  }
  if (
    parts.reduce((sum, quota) => sum + quota, 0) !== policy.total ||
    policy.partQuotas[ToeicPart.PART_1] +
      policy.partQuotas[ToeicPart.PART_2] +
      policy.partQuotas[ToeicPart.PART_3] +
      policy.partQuotas[ToeicPart.PART_4] !==
      policy.listeningTotal ||
    policy.partQuotas[ToeicPart.PART_5] +
      policy.partQuotas[ToeicPart.PART_6] +
      policy.partQuotas[ToeicPart.PART_7] !==
      policy.readingTotal
  ) {
    throw new FullMockPolicyError(
      'Full-mock totals and subtotals are inconsistent.',
    );
  }
}

validateFullMockPolicy(FULL_MOCK_POLICY);
