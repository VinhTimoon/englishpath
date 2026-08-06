import type { ToeicDifficulty, ToeicPart } from '../../generated/prisma/enums';

export const TOEIC_PRACTICE_CATALOGUE_REPOSITORY = Symbol(
  'TOEIC_PRACTICE_CATALOGUE_REPOSITORY',
);

export type ToeicPracticeCatalogue = Readonly<{
  listening: Readonly<{
    parts: readonly ToeicPart[];
    difficulties: readonly ToeicDifficulty[];
  }>;
  reading: Readonly<{
    parts: readonly ToeicPart[];
    difficulties: readonly ToeicDifficulty[];
    topics: readonly string[];
  }>;
}>;

export interface ToeicPracticeCatalogueRepository {
  catalogue(now: Date): Promise<ToeicPracticeCatalogue>;
}
