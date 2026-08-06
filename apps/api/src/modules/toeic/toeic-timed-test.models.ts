import type { TimedTestMode } from './toeic-timed-test.policy';
export const TOEIC_TIMED_TEST_REPOSITORY = Symbol(
  'TOEIC_TIMED_TEST_REPOSITORY',
);
export type TimedQuestion = {
  id: string;
  questionId: string;
  prompt: string;
  options: unknown;
  part: string;
  questionType: string;
  difficulty: string;
  topic: string | null;
  stimulusGroup: string | null;
  mediaReference: string | null;
  explanation: string | null;
};
export type TimedAnswer = {
  questionId: string;
  selectedOption: string;
  isCorrect: boolean;
  answeredAt: Date;
};
export type TimedSession = {
  id: string;
  userId: string;
  clientSessionId: string;
  mode: TimedTestMode;
  policyVersion: string;
  questionIds: string[];
  startedAt: Date;
  deadlineAt: Date;
  status: 'ACTIVE' | 'SUBMITTED' | 'EXPIRED';
  total: number;
  score: number | null;
  finalizedAt: Date | null;
  answers: TimedAnswer[];
};
export interface ToeicTimedTestRepository {
  eligibleQuestions(
    now: Date,
  ): Promise<readonly (TimedQuestion & { correctAnswer: string })[]>;
  findByClient(
    userId: string,
    clientSessionId: string,
  ): Promise<TimedSession | null>;
  find(id: string, userId: string): Promise<TimedSession | null>;
  create(
    input: Omit<
      TimedSession,
      'id' | 'answers' | 'status' | 'score' | 'finalizedAt'
    >,
  ): Promise<TimedSession>;
  answer(
    sessionId: string,
    questionId: string,
    selectedOption: string,
    isCorrect: boolean,
    at: Date,
  ): Promise<'created' | 'replayed' | 'conflict' | 'closed'>;
  finalize(
    id: string,
    userId: string,
    status: 'SUBMITTED' | 'EXPIRED',
    score: number,
    at: Date,
  ): Promise<boolean>;
}
