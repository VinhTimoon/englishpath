import type {
  ToeicDifficulty,
  ToeicPart,
  ToeicQuestionType,
} from '../../generated/prisma/enums';
import type { TimedTestMode, TimedTestStatus } from './toeic-timed-test.policy';

export const TOEIC_TIMED_TEST_REPOSITORY = Symbol(
  'TOEIC_TIMED_TEST_REPOSITORY',
);
export const TOEIC_TIMED_TEST_CLOCK = Symbol('TOEIC_TIMED_TEST_CLOCK');

export type TimedTestClock = () => Date;

export type TimedQuestion = Readonly<{
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

export type TimedPrivateQuestion = TimedQuestion &
  Readonly<{ correctAnswer: string }>;

export type TimedAnswer = Readonly<{
  questionId: string;
  selectedOption: string;
  isCorrect: boolean;
  answeredAt: Date;
}>;

export type TimedSession = Readonly<{
  id: string;
  userId: string;
  clientSessionId: string;
  mode: TimedTestMode;
  policyVersion: string;
  questionIds: readonly string[];
  startedAt: Date;
  deadlineAt: Date;
  status: TimedTestStatus;
  total: number;
  score: number | null;
  finalizedAt: Date | null;
  answers: readonly TimedAnswer[];
}>;

export type TimedSessionCreate = Readonly<{
  userId: string;
  clientSessionId: string;
  mode: TimedTestMode;
  policyVersion: string;
  questionIds: readonly string[];
  startedAt: Date;
  deadlineAt: Date;
  total: number;
}>;

export type TimedAnswerCreateResult =
  'created' | 'replayed' | 'conflict' | 'closed';

export type TimedFinalizeResult =
  | Readonly<{ state: 'finalized'; session: TimedSession }>
  | Readonly<{ state: 'incomplete'; session: TimedSession }>
  | Readonly<{ state: 'already-finalized'; session: TimedSession }>
  | Readonly<{ state: 'missing' }>;

export interface ToeicTimedTestRepository {
  eligibleQuestions(now: Date): Promise<readonly TimedPrivateQuestion[]>;
  safeQuestionsByIds(
    ids: readonly string[],
    now: Date,
  ): Promise<readonly TimedQuestion[]>;
  privateQuestionsByIds(
    ids: readonly string[],
    now: Date,
  ): Promise<readonly TimedPrivateQuestion[]>;
  findByClient(
    userId: string,
    clientSessionId: string,
  ): Promise<TimedSession | null>;
  find(id: string, userId: string): Promise<TimedSession | null>;
  create(input: TimedSessionCreate): Promise<TimedSession>;
  createAnswer(
    input: Readonly<{
      sessionId: string;
      questionId: string;
      selectedOption: string;
      isCorrect: boolean;
      answeredAt: Date;
    }>,
  ): Promise<TimedAnswerCreateResult>;
  finalize(id: string, userId: string, at: Date): Promise<TimedFinalizeResult>;
}
