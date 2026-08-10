import { Inject, Injectable } from '@nestjs/common';
import type { ApplicationPrincipal } from '../access';
import { TOEIC_ERROR_CODES, ToeicQuestionError } from './toeic-question.error';
import {
  learnerTaskProjection,
  type TaskVersion,
} from './toeic-speaking-writing.models';
import {
  TOEIC_WRITING_SUBMISSION_REPOSITORY,
  TOEIC_WRITING_TASK_CATALOGUE,
  type SafeWritingSession,
  type WritingSessionRecord,
  type WritingSubmissionRecord,
  type ToeicWritingSubmissionRepository,
  type ToeicWritingTaskCatalogue,
} from './toeic-writing-submission.models';
import type { SubmitToeicWritingDto } from './dto/toeic-writing-submission.dto';

const TOKEN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const WORD = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

function requireKey(value: string | undefined) {
  if (!value || !TOKEN.test(value)) {
    throw new ToeicQuestionError(TOEIC_ERROR_CODES.MISSING_IDEMPOTENCY_KEY);
  }
  return value;
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

export function countWritingWords(value: string) {
  return value.match(WORD)?.length ?? 0;
}

function safeSubmission(submission: WritingSubmissionRecord) {
  return {
    submissionId: submission.id,
    responseMode: submission.responseMode,
    wordCount: submission.wordCount,
    characterCount: submission.characterCount,
    submittedAt: submission.submittedAt,
  };
}

function safeSession(
  session: WritingSessionRecord,
  task: TaskVersion,
): SafeWritingSession {
  return {
    sessionId: session.id,
    status: session.status,
    task: learnerTaskProjection(task),
    startedAt: session.startedAt,
    finalizedAt: session.finalizedAt,
    submission: session.submission ? safeSubmission(session.submission) : null,
  };
}

@Injectable()
export class ToeicWritingSubmissionService {
  constructor(
    @Inject(TOEIC_WRITING_SUBMISSION_REPOSITORY)
    private readonly repository: ToeicWritingSubmissionRepository,
    @Inject(TOEIC_WRITING_TASK_CATALOGUE)
    private readonly catalogue: ToeicWritingTaskCatalogue,
  ) {}

  async start(
    principal: ApplicationPrincipal,
    taskId: string,
    idempotencyKey: string | undefined,
  ) {
    const key = requireKey(idempotencyKey);
    const task = await this.catalogue.findPublished(taskId);
    if (!task) throw new ToeicQuestionError(TOEIC_ERROR_CODES.NOT_FOUND);

    const existing = await this.repository.findByStartIdempotency(
      principal.applicationUserId,
      key,
    );
    if (existing) {
      if (
        existing.taskId !== task.id ||
        existing.taskVersion !== task.version
      ) {
        throw new ToeicQuestionError(TOEIC_ERROR_CODES.CONFLICT);
      }
      return { session: safeSession(existing, task), replayed: true };
    }

    try {
      const created = await this.repository.createSession({
        userId: principal.applicationUserId,
        taskId: task.id,
        taskVersion: task.version,
        idempotencyKey: key,
      });
      return { session: safeSession(created, task), replayed: false };
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      const replay = await this.repository.findByStartIdempotency(
        principal.applicationUserId,
        key,
      );
      if (
        replay &&
        replay.taskId === task.id &&
        replay.taskVersion === task.version
      ) {
        return { session: safeSession(replay, task), replayed: true };
      }
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.CONFLICT);
    }
  }

  async get(principal: ApplicationPrincipal, sessionId: string) {
    const session = await this.repository.findSession(
      principal.applicationUserId,
      sessionId,
    );
    if (!session) throw new ToeicQuestionError(TOEIC_ERROR_CODES.NOT_FOUND);
    const task = await this.catalogue.findPublished(session.taskId);
    if (!task || task.version !== session.taskVersion) {
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.NOT_FOUND);
    }
    return { session: safeSession(session, task) };
  }

  async submit(
    principal: ApplicationPrincipal,
    sessionId: string,
    input: SubmitToeicWritingDto,
    idempotencyKey: string | undefined,
  ) {
    const key = requireKey(idempotencyKey);
    const session = await this.repository.findSession(
      principal.applicationUserId,
      sessionId,
    );
    if (!session) throw new ToeicQuestionError(TOEIC_ERROR_CODES.NOT_FOUND);
    const task = await this.catalogue.findPublished(session.taskId);
    if (!task || task.version !== session.taskVersion) {
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.NOT_FOUND);
    }

    const text = input.text.trim();
    const wordCount = countWritingWords(text);
    const characterCount = Array.from(text).length;
    const minWords = task.minWords ?? 1;
    const maxWords = task.maxWords ?? 10_000;
    if (
      input.text.length > 20_000 ||
      characterCount === 0 ||
      wordCount < minWords ||
      wordCount > maxWords
    ) {
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.INVALID_CONTENT);
    }

    if (session.status !== 'ACTIVE') {
      const existing = await this.repository.findSubmissionByIdempotency(
        principal.applicationUserId,
        key,
      );
      if (
        existing &&
        this.sameSubmission(
          existing,
          sessionId,
          text,
          wordCount,
          characterCount,
        )
      ) {
        return { session: safeSession(session, task), replayed: true };
      }
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.CONFLICT);
    }

    try {
      const result = await this.repository.finalizeWithSubmission(
        {
          sessionId,
          userId: principal.applicationUserId,
          idempotencyKey: key,
          responseMode: 'TEXT',
          wordCount,
          characterCount,
          submittedText: text,
        },
        new Date(),
      );
      if (!result) {
        const current = await this.repository.findSession(
          principal.applicationUserId,
          sessionId,
        );
        const existing = await this.repository.findSubmissionByIdempotency(
          principal.applicationUserId,
          key,
        );
        if (
          current &&
          existing &&
          this.sameSubmission(
            existing,
            sessionId,
            text,
            wordCount,
            characterCount,
          )
        ) {
          return { session: safeSession(current, task), replayed: true };
        }
        throw new ToeicQuestionError(TOEIC_ERROR_CODES.CONFLICT);
      }
      return {
        session: safeSession(result.session, task),
        replayed: !result.created,
      };
    } catch (error) {
      if (error instanceof ToeicQuestionError) throw error;
      if (!isUniqueConstraintError(error)) throw error;
      const current = await this.repository.findSession(
        principal.applicationUserId,
        sessionId,
      );
      const existing = await this.repository.findSubmissionByIdempotency(
        principal.applicationUserId,
        key,
      );
      if (
        current &&
        existing &&
        this.sameSubmission(
          existing,
          sessionId,
          text,
          wordCount,
          characterCount,
        )
      ) {
        return { session: safeSession(current, task), replayed: true };
      }
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.CONFLICT);
    }
  }

  private sameSubmission(
    submission: WritingSubmissionRecord,
    sessionId: string,
    text: string,
    wordCount: number,
    characterCount: number,
  ) {
    return (
      submission.sessionId === sessionId &&
      submission.responseMode === 'TEXT' &&
      submission.submittedText === text &&
      submission.wordCount === wordCount &&
      submission.characterCount === characterCount
    );
  }
}
