export const PRACTICE_REPOSITORY = Symbol('PRACTICE_REPOSITORY');

export type PracticeAnswerInput = Readonly<{
  questionId: string;
  selectedOption: string;
  isCorrect: boolean;
  prompt: string;
  correctOption: string;
  explanation: string;
}>;

export type PracticeSessionState = Readonly<{
  id: string;
  status: 'ACTIVE' | 'SUBMITTED';
  answeredQuestionIds: readonly string[];
  score: number;
  total: number;
  xpAwarded: number;
  streakDays: number;
  errors: readonly Readonly<{
    questionId: string;
    prompt: string;
    selectedOption: string;
    correctOption: string;
    explanation: string;
  }>[];
}>;

export type PersistedPracticeAnswer = Readonly<{
  session: PracticeSessionState;
  selectedOption: string;
  isCorrect: boolean;
}>;

export type ProgressSummary = Readonly<{
  xp: number;
  streakDays: number;
  completedSessions: number;
  reviewErrors: number;
}>;
