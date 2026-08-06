import type { Prisma } from '../../generated/prisma/client';
import type {
  ToeicDifficulty,
  ToeicPart,
  ToeicQuestionType,
} from '../../generated/prisma/enums';

export const TOEIC_QUESTION_REPOSITORY = Symbol('TOEIC_QUESTION_REPOSITORY');

export const TOEIC_QUESTION_SAFE_SELECT = {
  id: true,
  questionId: true,
  version: true,
  part: true,
  questionType: true,
  difficulty: true,
  topic: true,
  stimulusGroup: true,
  prompt: true,
  options: true,
  mediaReference: true,
  explanation: true,
} as const satisfies Prisma.ToeicQuestionVersionSelect;

export type SafeToeicQuestion = Prisma.ToeicQuestionVersionGetPayload<{
  select: typeof TOEIC_QUESTION_SAFE_SELECT;
}>;

export type ToeicQuestionListInput = Readonly<{
  page: number;
  size: number;
  skip: number;
  take: number;
  now: Date;
  part?: ToeicPart;
  questionType?: ToeicQuestionType;
  difficulty?: ToeicDifficulty;
  topic?: string;
  stimulusGroup?: string;
}>;

export interface ToeicQuestionRepository {
  list(
    input: ToeicQuestionListInput,
  ): Promise<
    Readonly<{ items: readonly SafeToeicQuestion[]; totalItems: number }>
  >;
  find(questionId: string, now: Date): Promise<SafeToeicQuestion | null>;
}
