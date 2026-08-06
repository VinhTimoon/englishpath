import type {
  ToeicDifficulty,
  ToeicPart,
  ToeicQuestionType,
} from '../../generated/prisma/enums';

export const TOEIC_READING_PRACTICE_REPOSITORY = Symbol(
  'TOEIC_READING_PRACTICE_REPOSITORY',
);

export type ReadingQuestion = Readonly<{
  id: string;
  questionId: string;
  prompt: string;
  options: unknown;
  part: ToeicPart;
  questionType: ToeicQuestionType;
  difficulty: ToeicDifficulty;
  topic: string | null;
  stimulusGroup: string | null;
  mediaReference: string | null;
  explanation: string | null;
}>;

export type SafeReadingQuestion = Readonly<{
  id: string;
  questionId: string;
  prompt: string;
  options: readonly Readonly<{ id: string; text: string }>[];
  part: ToeicPart;
  questionType: ToeicQuestionType;
  difficulty: ToeicDifficulty;
  topic: string | null;
  stimulusGroup: string | null;
  mediaReference: string | null;
  explanation: string | null;
}>;

export type ReadingPrivateQuestion = Readonly<{
  id: string;
  options: unknown;
  correctAnswer: string;
}>;

export type ReadingAnswer = Readonly<{
  id: string;
  sessionId: string;
  questionId: string;
  selectedOption: string;
  answeredAt: Date;
}>;

export type ReadingGradingAnswer = ReadingAnswer &
  Readonly<{
    isCorrect: boolean;
  }>;

export type ReadingSession = Readonly<{
  id: string;
  userId: string;
  clientSessionId: string;
  readingPart: ToeicPart | null;
  questionIds: readonly string[];
  status: 'ACTIVE' | 'SUBMITTED';
  total: number;
  score: number | null;
  startedAt: Date;
  submittedAt: Date | null;
  answers: readonly ReadingAnswer[];
}>;

export type ReadingGradingSession = Omit<ReadingSession, 'answers'> &
  Readonly<{
    answers: readonly ReadingGradingAnswer[];
  }>;

export type ReadingSessionCreate = Readonly<{
  userId: string;
  clientSessionId: string;
  readingPart: ToeicPart | null;
  questionIds: readonly string[];
  total: number;
}>;

export type ReadingAnswerCreate = Readonly<{
  sessionId: string;
  questionId: string;
  selectedOption: string;
  isCorrect: boolean;
}>;

export interface ToeicReadingPracticeRepository {
  eligibleQuestions(
    now: Date,
    readingPart?: ToeicPart,
  ): Promise<readonly ReadingQuestion[]>;
  safeQuestionsByIds(
    ids: readonly string[],
    now: Date,
  ): Promise<readonly ReadingQuestion[]>;
  snapshotQuestionsByIds(
    ids: readonly string[],
    now: Date,
  ): Promise<readonly ReadingQuestion[]>;
  privateQuestionsByIds(
    ids: readonly string[],
    now: Date,
  ): Promise<readonly ReadingPrivateQuestion[]>;
  findSession(id: string, userId: string): Promise<ReadingSession | null>;
  findGradingSession(
    id: string,
    userId: string,
  ): Promise<ReadingGradingSession | null>;
  findByClient(
    userId: string,
    clientSessionId: string,
  ): Promise<ReadingSession | null>;
  createSession(input: ReadingSessionCreate): Promise<ReadingSession>;
  createAnswer(input: ReadingAnswerCreate): Promise<boolean>;
  submitSession(
    id: string,
    userId: string,
    score: number,
    submittedAt: Date,
  ): Promise<boolean>;
}
