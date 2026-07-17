import type {
  PersistedPracticeAnswer,
  PracticeAnswerInput,
  PracticeSessionState,
  ProgressSummary,
} from './practice.models';

export interface PracticeRepository {
  start(
    userId: string,
    clientSessionId: string,
    questionIds: readonly string[],
  ): Promise<PracticeSessionState>;
  answer(
    userId: string,
    sessionId: string,
    input: PracticeAnswerInput,
  ): Promise<PersistedPracticeAnswer | null>;
  submit(
    userId: string,
    sessionId: string,
  ): Promise<PracticeSessionState | null>;
  result(
    userId: string,
    sessionId: string,
  ): Promise<PracticeSessionState | null>;
  summary(userId: string): Promise<ProgressSummary>;
  errors(userId: string): Promise<PracticeSessionState['errors']>;
}
