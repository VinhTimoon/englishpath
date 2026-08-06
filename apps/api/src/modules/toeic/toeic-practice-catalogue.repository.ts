import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { ToeicDifficulty, ToeicPart } from '../../generated/prisma/enums';
import {
  TOEIC_LISTENING_PARTS,
  TOEIC_READING_PARTS,
  toeicEligibleWhere,
} from './toeic-eligibility.policy';
import type {
  ToeicPracticeCatalogue,
  ToeicPracticeCatalogueRepository,
} from './toeic-practice-catalogue.models';

type CatalogueRow = {
  questionId: string;
  part: ToeicPart;
  difficulty: ToeicDifficulty;
  topic: string | null;
};

type CatalogueDb = {
  toeicQuestionVersion: {
    findMany(args: Record<string, unknown>): Promise<unknown>;
  };
};

const CATALOGUE_SELECT = {
  questionId: true,
  part: true,
  difficulty: true,
  topic: true,
} as const;

const DIFFICULTIES: readonly ToeicDifficulty[] = [
  'BEGINNER',
  'ELEMENTARY',
  'INTERMEDIATE',
  'UPPER_INTERMEDIATE',
  'ADVANCED',
];

function orderParts(
  values: ReadonlySet<ToeicPart>,
  parts: readonly ToeicPart[],
) {
  return parts.filter((part) => values.has(part));
}

function orderDifficulties(values: ReadonlySet<ToeicDifficulty>) {
  return DIFFICULTIES.filter((difficulty) => values.has(difficulty));
}

@Injectable()
export class PrismaToeicPracticeCatalogueRepository implements ToeicPracticeCatalogueRepository {
  private readonly db: CatalogueDb;

  constructor(prisma: PrismaService) {
    this.db = prisma as unknown as CatalogueDb;
  }

  async catalogue(now: Date): Promise<ToeicPracticeCatalogue> {
    const rows = await this.db.toeicQuestionVersion.findMany({
      where: toeicEligibleWhere(now, { practiceEligible: true }),
      orderBy: [{ questionId: 'asc' }, { version: 'desc' }],
      select: CATALOGUE_SELECT,
    });

    const current = new Map<string, CatalogueRow>();
    for (const row of rows as readonly CatalogueRow[]) {
      if (!current.has(row.questionId)) current.set(row.questionId, row);
    }

    const listeningParts = new Set<ToeicPart>();
    const readingParts = new Set<ToeicPart>();
    const listeningDifficulties = new Set<ToeicDifficulty>();
    const readingDifficulties = new Set<ToeicDifficulty>();
    const topics = new Set<string>();

    for (const row of current.values()) {
      if ((TOEIC_LISTENING_PARTS as readonly ToeicPart[]).includes(row.part)) {
        listeningParts.add(row.part);
        listeningDifficulties.add(row.difficulty);
      }
      if ((TOEIC_READING_PARTS as readonly ToeicPart[]).includes(row.part)) {
        readingParts.add(row.part);
        readingDifficulties.add(row.difficulty);
        if (row.topic?.trim()) topics.add(row.topic);
      }
    }

    return {
      listening: {
        parts: orderParts(listeningParts, TOEIC_LISTENING_PARTS),
        difficulties: orderDifficulties(listeningDifficulties),
      },
      reading: {
        parts: orderParts(readingParts, TOEIC_READING_PARTS),
        difficulties: orderDifficulties(readingDifficulties),
        topics: [...topics].sort((a, b) => a.localeCompare(b)),
      },
    };
  }
}
