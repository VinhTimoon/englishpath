import { Inject, Injectable } from '@nestjs/common';
import type { ApplicationPrincipal } from '../access';
import { TOEIC_ERROR_CODES, ToeicQuestionError } from './toeic-question.error';
import type {
  TimedPrivateQuestion,
  TimedQuestion,
  TimedSession,
  TimedTestClock,
  ToeicTimedTestRepository,
} from './toeic-timed-test.models';
import {
  TOEIC_TIMED_TEST_CLOCK,
  TOEIC_TIMED_TEST_REPOSITORY,
} from './toeic-timed-test.models';
import {
  TOEIC_TIMED_TEST_POLICY_VERSION,
  timedTestPolicy,
  type TimedTestMode,
} from './toeic-timed-test.policy';

type Option = Readonly<{ id: string; text: string }>;

function isUniqueConstraint(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

function parseOptions(value: unknown): readonly Option[] {
  if (!Array.isArray(value) || value.length < 2 || value.length > 6) {
    throw new ToeicQuestionError(TOEIC_ERROR_CODES.INVALID_CONTENT);
  }
  const options: Option[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'object' || item === null) {
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.INVALID_CONTENT);
    }
    const record = item as { id?: unknown; text?: unknown };
    if (
      typeof record.id !== 'string' ||
      !/^[A-F]$/.test(record.id) ||
      typeof record.text !== 'string' ||
      !record.text.trim() ||
      seen.has(record.id)
    ) {
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.INVALID_CONTENT);
    }
    seen.add(record.id);
    options.push({ id: record.id, text: record.text.trim() });
  }
  return options;
}

function safeQuestion(question: TimedQuestion) {
  return {
    id: question.id,
    questionId: question.questionId,
    prompt: question.prompt,
    options: parseOptions(question.options),
    part: question.part,
    questionType: question.questionType,
    difficulty: question.difficulty,
    topic: question.topic,
    stimulusGroup: question.stimulusGroup,
    mediaReference: question.mediaReference,
    explanation: question.explanation,
  };
}

function safeSession(
  session: TimedSession,
  clock: TimedTestClock,
  questions: readonly ReturnType<typeof safeQuestion>[] = [],
) {
  return {
    sessionId: session.id,
    mode: session.mode,
    status: session.status,
    total: session.total,
    answered: session.answers.length,
    startedAt: session.startedAt,
    deadlineAt: session.deadlineAt,
    remainingSeconds: Math.max(
      0,
      Math.ceil((session.deadlineAt.getTime() - clock().getTime()) / 1000),
    ),
    ...(session.status === 'SUBMITTED' || session.status === 'EXPIRED'
      ? { score: session.score }
      : {}),
    ...(questions.length > 0 ? { questions } : {}),
  };
}

function asMode(value: string): TimedTestMode {
  if (value === 'MINI' || value === 'HALF') return value;
  throw new ToeicQuestionError(TOEIC_ERROR_CODES.INVALID_CONTENT);
}

@Injectable()
export class ToeicTimedTestService {
  constructor(
    @Inject(TOEIC_TIMED_TEST_REPOSITORY)
    private readonly repository: ToeicTimedTestRepository,
    @Inject(TOEIC_TIMED_TEST_CLOCK)
    private readonly clock: TimedTestClock,
  ) {}

  async start(
    principal: ApplicationPrincipal,
    input: Readonly<{ clientSessionId: string; mode: string }>,
  ) {
    const mode = asMode(input.mode);
    try {
      const existing = await this.repository.findByClient(
        principal.applicationUserId,
        input.clientSessionId,
      );
      if (existing) {
        if (existing.mode !== mode) {
          throw new ToeicQuestionError(TOEIC_ERROR_CODES.CONFLICT);
        }
        const questions = await this.safeQuestions(existing);
        return {
          session: safeSession(existing, this.clock, questions),
          questions,
          replayed: true,
        };
      }

      const policy = timedTestPolicy(mode);
      const startedAt = this.clock();
      const eligible = await this.repository.eligibleQuestions(startedAt);
      const byPart = new Map<string, TimedPrivateQuestion[]>();
      for (const question of eligible) {
        const bucket = byPart.get(question.part) ?? [];
        bucket.push(question);
        byPart.set(question.part, bucket);
      }
      const selected: TimedPrivateQuestion[] = [];
      for (const [part, count] of Object.entries(policy.quotas)) {
        const bucket = byPart.get(part) ?? [];
        if (bucket.length < count) {
          throw new ToeicQuestionError(TOEIC_ERROR_CODES.NOT_FOUND);
        }
        selected.push(...bucket.slice(0, count));
      }

      const created = await this.repository.create({
        userId: principal.applicationUserId,
        clientSessionId: input.clientSessionId,
        mode,
        policyVersion: TOEIC_TIMED_TEST_POLICY_VERSION,
        questionIds: selected.map((question) => question.id),
        startedAt,
        deadlineAt: new Date(
          startedAt.getTime() + policy.durationSeconds * 1000,
        ),
        total: policy.total,
      });
      const questions = selected.map(safeQuestion);
      return {
        session: safeSession(created, this.clock, questions),
        questions,
        replayed: false,
      };
    } catch (error) {
      if (error instanceof ToeicQuestionError) throw error;
      if (isUniqueConstraint(error)) {
        const replay = await this.repository.findByClient(
          principal.applicationUserId,
          input.clientSessionId,
        );
        if (replay?.mode === mode) {
          const questions = await this.safeQuestions(replay);
          return {
            session: safeSession(replay, this.clock, questions),
            questions,
            replayed: true,
          };
        }
        throw new ToeicQuestionError(TOEIC_ERROR_CODES.CONFLICT);
      }
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.REPOSITORY_FAILURE);
    }
  }

  async get(principal: ApplicationPrincipal, sessionId: string) {
    const session = await this.resolveSession(principal, sessionId);
    const questions =
      session.status === 'ACTIVE' ? await this.safeQuestions(session) : [];
    return { session: safeSession(session, this.clock, questions), questions };
  }

  async answer(
    principal: ApplicationPrincipal,
    sessionId: string,
    input: Readonly<{ questionId: string; selectedOption: string }>,
  ) {
    try {
      const session = await this.repository.find(
        sessionId,
        principal.applicationUserId,
      );
      if (!session) throw new ToeicQuestionError(TOEIC_ERROR_CODES.NOT_FOUND);
      const now = this.clock();
      if (session.status !== 'ACTIVE' || now >= session.deadlineAt) {
        if (session.status === 'ACTIVE')
          await this.repository.finalize(
            sessionId,
            principal.applicationUserId,
            now,
          );
        throw new ToeicQuestionError(TOEIC_ERROR_CODES.CONFLICT);
      }
      if (!session.questionIds.includes(input.questionId)) {
        throw new ToeicQuestionError(TOEIC_ERROR_CODES.NOT_FOUND);
      }
      // Validate the persisted question snapshot and its option set before
      // handling retries. This keeps malformed/retired snapshot rows closed
      // even when an answer request is repeated.
      const question = (
        await this.repository.privateQuestionsByIds([input.questionId], now)
      )[0];
      if (!question) throw new ToeicQuestionError(TOEIC_ERROR_CODES.NOT_FOUND);
      const options = parseOptions(question.options);
      if (!options.some((option) => option.id === input.selectedOption)) {
        throw new ToeicQuestionError(TOEIC_ERROR_CODES.INVALID_CONTENT);
      }
      const prior = session.answers.find(
        (answer) => answer.questionId === input.questionId,
      );
      if (prior) {
        if (prior.selectedOption !== input.selectedOption) {
          throw new ToeicQuestionError(TOEIC_ERROR_CODES.CONFLICT);
        }
        return {
          accepted: true,
          replayed: true,
          questionId: input.questionId,
          answered: session.answers.length,
          total: session.total,
        };
      }

      const result = await this.repository.createAnswer({
        sessionId,
        questionId: input.questionId,
        selectedOption: input.selectedOption,
        isCorrect: question.correctAnswer === input.selectedOption,
        answeredAt: now,
      });
      if (result === 'closed') {
        throw new ToeicQuestionError(TOEIC_ERROR_CODES.CONFLICT);
      }
      if (result === 'conflict') {
        throw new ToeicQuestionError(TOEIC_ERROR_CODES.CONFLICT);
      }
      const current = await this.repository.find(
        sessionId,
        principal.applicationUserId,
      );
      if (!current) {
        throw new ToeicQuestionError(TOEIC_ERROR_CODES.REPOSITORY_FAILURE);
      }
      return {
        accepted: true,
        replayed: result === 'replayed',
        questionId: input.questionId,
        answered: current.answers.length,
        total: current.total,
      };
    } catch (error) {
      if (error instanceof ToeicQuestionError) throw error;
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.REPOSITORY_FAILURE);
    }
  }

  async submit(principal: ApplicationPrincipal, sessionId: string) {
    try {
      const result = await this.repository.finalize(
        sessionId,
        principal.applicationUserId,
        this.clock(),
      );
      if (result.state === 'missing') {
        throw new ToeicQuestionError(TOEIC_ERROR_CODES.NOT_FOUND);
      }
      if (result.state === 'incomplete') {
        throw new ToeicQuestionError(TOEIC_ERROR_CODES.INCOMPLETE);
      }
      return { session: safeSession(result.session, this.clock) };
    } catch (error) {
      if (error instanceof ToeicQuestionError) throw error;
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.REPOSITORY_FAILURE);
    }
  }

  async result(principal: ApplicationPrincipal, sessionId: string) {
    try {
      const session = await this.resolveSession(principal, sessionId);
      const questions =
        session.status === 'ACTIVE' ? await this.safeQuestions(session) : [];
      return {
        session: safeSession(session, this.clock, questions),
        questions,
      };
    } catch (error) {
      if (error instanceof ToeicQuestionError) throw error;
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.REPOSITORY_FAILURE);
    }
  }

  private async resolveSession(
    principal: ApplicationPrincipal,
    sessionId: string,
  ): Promise<TimedSession> {
    const session = await this.repository.find(
      sessionId,
      principal.applicationUserId,
    );
    if (!session) throw new ToeicQuestionError(TOEIC_ERROR_CODES.NOT_FOUND);
    if (session.status !== 'ACTIVE' || this.clock() < session.deadlineAt) {
      return session;
    }
    const finalized = await this.repository.finalize(
      sessionId,
      principal.applicationUserId,
      this.clock(),
    );
    if (finalized.state === 'missing') {
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.NOT_FOUND);
    }
    return finalized.session;
  }

  private async safeQuestions(session: TimedSession) {
    const questions = await this.repository.safeQuestionsByIds(
      session.questionIds,
      this.clock(),
    );
    if (questions.length !== session.questionIds.length) {
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.NOT_FOUND);
    }
    const byId = new Map(questions.map((question) => [question.id, question]));
    return session.questionIds.map((id) => safeQuestion(byId.get(id)!));
  }
}
