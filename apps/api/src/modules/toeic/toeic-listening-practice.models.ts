import type {
  ToeicDifficulty,
  ToeicPart,
  ToeicQuestionType,
} from '../../generated/prisma/enums';

export const TOEIC_LISTENING_PRACTICE_REPOSITORY = Symbol(
  'TOEIC_LISTENING_PRACTICE_REPOSITORY',
);

export type ToeicPracticeStatus = 'ACTIVE' | 'SUBMITTED';

export type ToeicListeningQuestion = Readonly<{
  id: string;
  questionId: string;
  prompt: string;
  options: unknown;
  part: ToeicPart;
  questionType: ToeicQuestionType;
  difficulty: ToeicDifficulty;
  mediaReference: string | null;
}>;

export type SafeToeicListeningQuestion = Readonly<{
  id: string;
  questionId: string;
  prompt: string;
  options: readonly Readonly<{ id: string; text: string }>[];
  part: ToeicPart;
  questionType: ToeicQuestionType;
  difficulty: ToeicDifficulty;
  mediaReference: string | null;
}>;

export type ToeicPrivateQuestion = Readonly<{
  id: string;
  options: unknown;
  correctAnswer: string;
}>;

export type ToeicPracticeAnswerRecord = Readonly<{
  id: string;
  sessionId: string;
  questionId: string;
  selectedOption: string;
  isCorrect: boolean;
  answeredAt: Date;
}>;

export type ToeicPracticeSessionRecord = Readonly<{
  id: string;
  userId: string;
  clientSessionId: string;
  listeningPart: ToeicPart | null;
  difficulty?: ToeicDifficulty | null;
  questionIds: readonly string[];
  status: ToeicPracticeStatus;
  total: number;
  score: number | null;
  startedAt: Date;
  submittedAt: Date | null;
  answers: readonly ToeicPracticeAnswerRecord[];
}>;

export type ToeicPracticeSessionCreate = Readonly<{
  userId: string;
  clientSessionId: string;
  listeningPart: ToeicPart | null;
  difficulty?: ToeicDifficulty | null;
  questionIds: readonly string[];
  total: number;
}>;

export type ToeicPracticeAnswerCreate = Readonly<{
  sessionId: string;
  questionId: string;
  selectedOption: string;
  isCorrect: boolean;
}>;

export interface ToeicListeningPracticeRepository {
  eligibleQuestions(
    now: Date,
    listeningPart?: ToeicPart,
    difficulty?: ToeicDifficulty,
  ): Promise<readonly ToeicListeningQuestion[]>;
  safeQuestionsByIds(
    ids: readonly string[],
    now: Date,
  ): Promise<readonly ToeicListeningQuestion[]>;
  privateQuestionsByIds(
    ids: readonly string[],
    now: Date,
  ): Promise<readonly ToeicPrivateQuestion[]>;
  findSession(
    id: string,
    userId: string,
  ): Promise<ToeicPracticeSessionRecord | null>;
  findByClient(
    userId: string,
    clientSessionId: string,
  ): Promise<ToeicPracticeSessionRecord | null>;
  createSession(
    input: ToeicPracticeSessionCreate,
  ): Promise<ToeicPracticeSessionRecord>;
  createAnswer(input: ToeicPracticeAnswerCreate): Promise<boolean>;
  submitSession(
    id: string,
    userId: string,
    score: number,
    submittedAt: Date,
  ): Promise<boolean>;
}
