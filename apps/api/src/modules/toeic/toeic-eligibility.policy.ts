import type { Prisma } from '../../generated/prisma/client';
import { ToeicDifficulty, ToeicPart } from '../../generated/prisma/enums';

export const TOEIC_LISTENING_PARTS = [
  ToeicPart.PART_1,
  ToeicPart.PART_2,
  ToeicPart.PART_3,
  ToeicPart.PART_4,
] as const;
export const TOEIC_READING_PARTS = [
  ToeicPart.PART_5,
  ToeicPart.PART_6,
  ToeicPart.PART_7,
] as const;

type EligibilityOptions = Readonly<{
  listeningPart?: ToeicPart;
  readingPart?: ToeicPart;
  practiceEligible?: boolean;
  listeningPractice?: boolean;
  readingPractice?: boolean;
  difficulty?: ToeicDifficulty;
  topic?: string;
}>;

export function toeicEligibleWhere(
  now: Date,
  options: EligibilityOptions = {},
): Prisma.ToeicQuestionVersionWhereInput {
  return {
    ...(options.listeningPart || options.readingPart
      ? { part: options.listeningPart || options.readingPart }
      : options.listeningPractice
        ? { part: { in: [...TOEIC_LISTENING_PARTS] } }
        : options.readingPractice
          ? { part: { in: [...TOEIC_READING_PARTS] } }
          : options.practiceEligible
            ? {
                part: {
                  in: [...TOEIC_LISTENING_PARTS, ...TOEIC_READING_PARTS],
                },
              }
            : {}),
    ...(options.difficulty ? { difficulty: options.difficulty } : {}),
    ...(options.topic ? { topic: options.topic } : {}),
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
