export const LIBRARY_LEARNING_REPOSITORY = Symbol(
  'LIBRARY_LEARNING_REPOSITORY',
);

export type LibraryProgressRecord = {
  positionSeconds: number;
  status: string;
  version: number;
  updatedAt: Date;
};

export type LibraryBookmarkRecord = { timestampSeconds: number };
export type LibraryNoteRecord = { body: string; updatedAt: Date };
export type LibraryDrillOutcomeRecord = {
  questionId: string;
  selectedOptionId: string;
  isCorrect: boolean;
  score: number;
  completedAt: Date;
};
export type CreateLibraryDrillOutcome = {
  userId: string;
  contentVersionId: string;
  drillId: string;
  questionId: string;
  selectedOptionId: string;
  isCorrect: boolean;
  score: number;
};

export type LibraryLearningRepositoryPort = {
  findProgress(
    userId: string,
    contentVersionId: string,
  ): Promise<LibraryProgressRecord | null>;
  listBookmarks(
    userId: string,
    contentVersionId: string,
  ): Promise<LibraryBookmarkRecord[]>;
  findNote(
    userId: string,
    contentVersionId: string,
  ): Promise<LibraryNoteRecord | null>;
  upsertProgress(
    userId: string,
    contentVersionId: string,
    data: {
      status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
      positionSeconds: number;
    },
  ): Promise<LibraryProgressRecord>;
  upsertBookmark(
    userId: string,
    contentVersionId: string,
    timestampSeconds: number,
  ): Promise<LibraryBookmarkRecord>;
  deleteBookmark(
    userId: string,
    contentVersionId: string,
    timestampSeconds: number,
  ): Promise<{ count: number }>;
  upsertNote(
    userId: string,
    contentVersionId: string,
    body: string,
  ): Promise<LibraryNoteRecord>;
  deleteNote(
    userId: string,
    contentVersionId: string,
  ): Promise<{ count: number }>;
  findDrillOutcome?(
    userId: string,
    contentVersionId: string,
    drillId: string,
    questionId: string,
  ): Promise<LibraryDrillOutcomeRecord | null>;
  createDrillOutcome?(
    data: CreateLibraryDrillOutcome,
  ): Promise<LibraryDrillOutcomeRecord>;
  listDrillOutcomes?(
    userId: string,
    contentVersionId: string,
  ): Promise<LibraryDrillOutcomeRecord[]>;
};
