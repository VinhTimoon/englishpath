export const PRACTICE_REPOSITORY = Symbol('PRACTICE_REPOSITORY');

export const TOEIC_ERROR_NOTEBOOK_CAPTURE = Symbol(
  'TOEIC_ERROR_NOTEBOOK_CAPTURE',
);

export type ErrorNotebookCapture = Readonly<{
  userId: string;
  sessionId: string;
  answers: readonly Readonly<{
    questionId: string;
    selectedOption: string;
    isCorrect: boolean;
  }>[];
  questions: readonly Readonly<{
    questionId: string;
    prompt: string;
    correctOption: string;
    explanation: string;
  }>[];
}>;

export type ErrorNotebookCaptureHandler = (
  input: ErrorNotebookCapture,
) => Promise<number>;

export type ErrorNotebookSource = 'PRACTICE' | 'TOEIC_TIMED_TEST';

export type ErrorNotebookQuery = Readonly<{
  page: number;
  size: number;
  source?: ErrorNotebookSource;
}>;

export type ErrorNotebookEntry = Readonly<{
  questionId: string;
  prompt: string;
  selectedOption: string;
  correctOption: string;
  explanation: string;
  source: ErrorNotebookSource;
  remediation: Readonly<{
    href: string;
    label: string;
  }>;
}>;

export type ErrorNotebookPage = Readonly<{
  entries: readonly ErrorNotebookEntry[];
  pagination: Readonly<{
    page: number;
    size: number;
    total: number;
    hasNext: boolean;
  }>;
}>;

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
