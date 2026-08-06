import type { Prisma } from '../../generated/prisma/client';
import { ToeicPart } from '../../generated/prisma/enums';

export const TOEIC_LISTENING_PARTS = [
  ToeicPart.PART_1,
  ToeicPart.PART_2,
  ToeicPart.PART_3,
  ToeicPart.PART_4,
] as const;

type EligibilityOptions = Readonly<{
  listeningPart?: ToeicPart;
  practiceEligible?: boolean;
}>;

export function toeicEligibleWhere(
  now: Date,
  options: EligibilityOptions = {},
): Prisma.ToeicQuestionVersionWhereInput {
  return {
    ...(options.listeningPart
      ? { part: options.listeningPart }
      : options.practiceEligible
        ? { part: { in: [...TOEIC_LISTENING_PARTS] } }
        : {}),
    reviewStatus: 'REVIEWED',
    publicationState: 'PUBLISHED',
    licenseStatus: 'APPROVED',
    ...(options.practiceEligible
      ? {
          allowedUsageScopes: { has: 'PRACTICE' },
          accessTier: 'FREE',
        }
      : {}),
    publishedAt: { lte: now },
    OR: [{ validUntil: null }, { validUntil: { gt: now } }],
  };
}
