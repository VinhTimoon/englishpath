export const DAILY_SENTENCE_REPOSITORY = Symbol('DAILY_SENTENCE_REPOSITORY');
export type SentenceRecord = {
  id: string;
  prompt: string;
  expectedAnswer: string;
};
export type CompletionRecord = {
  sentence: SentenceRecord;
  submittedAnswer: string;
  isCorrect: boolean;
  feedback: string;
  completedAt: Date;
};
export type DailySentenceView = {
  localDate: string;
  sentence: { id: string; prompt: string } | null;
  completed: boolean;
  feedback?: { isCorrect: boolean; message: string; completedAt: string };
};
