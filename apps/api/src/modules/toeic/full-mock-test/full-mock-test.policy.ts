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
    typeof policy !== 'object' ||
    policy === null ||
    typeof policy.partQuotas !== 'object' ||
    policy.partQuotas === null ||
    Array.isArray(policy.partQuotas)
  ) {
    throw new FullMockPolicyError('Full-mock policy must be an object.');
  }
  if (
    typeof policy.version !== 'string' ||
    !policy.version.trim() ||
    policy.total !== 200 ||
    !Number.isInteger(policy.durationSeconds) ||
    policy.durationSeconds <= 0 ||
    !Number.isInteger(policy.listeningTotal) ||
    policy.listeningTotal <= 0 ||
    !Number.isInteger(policy.readingTotal) ||
    policy.readingTotal <= 0
  ) {
    throw new FullMockPolicyError(
      'Full-mock version and duration must be valid.',
    );
  }
  const partKeys = Object.values(ToeicPart);
  if (
    Object.keys(policy.partQuotas).length !== partKeys.length ||
    partKeys.some((part) => !(part in policy.partQuotas))
  ) {
    throw new FullMockPolicyError('Every TOEIC Part quota must be declared.');
  }
  const quotas = partKeys.map((part) => policy.partQuotas[part]);
  if (quotas.some((quota) => !Number.isInteger(quota) || quota <= 0)) {
    throw new FullMockPolicyError(
      'Every Part quota must be a positive integer.',
    );
  }
  if (
    quotas.reduce((sum, quota) => sum + quota, 0) !== policy.total ||
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
