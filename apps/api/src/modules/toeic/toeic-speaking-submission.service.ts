import { Inject, Injectable } from '@nestjs/common';
import type { ApplicationPrincipal } from '../access';
import {
  learnerTaskProjection,
  type TaskVersion,
} from './toeic-speaking-writing.models';
import { TOEIC_ERROR_CODES, ToeicQuestionError } from './toeic-question.error';
import {
  TOEIC_SPEAKING_SUBMISSION_REPOSITORY,
  TOEIC_SPEAKING_TASK_CATALOGUE,
  type SafeSpeakingSession,
  type SpeakingSessionRecord,
  type SpeakingSubmissionRecord,
  type ToeicSpeakingSubmissionRepository,
  type ToeicSpeakingTaskCatalogue,
} from './toeic-speaking-submission.models';
import type { SubmitToeicSpeakingDto } from './dto/toeic-speaking-submission.dto';

const TOKEN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

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

function safeSubmission(submission: SpeakingSubmissionRecord) {
  return {
    submissionId: submission.id,
    responseMode: submission.responseMode,
    durationSeconds: submission.durationSeconds,
    sizeBytes: submission.sizeBytes,
    submittedAt: submission.submittedAt,
  };
}

function safeSession(
  session: SpeakingSessionRecord,
  task: TaskVersion,
): SafeSpeakingSession {
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
export class ToeicSpeakingSubmissionService {
  constructor(
    @Inject(TOEIC_SPEAKING_SUBMISSION_REPOSITORY)
    private readonly repository: ToeicSpeakingSubmissionRepository,
    @Inject(TOEIC_SPEAKING_TASK_CATALOGUE)
    private readonly catalogue: ToeicSpeakingTaskCatalogue,
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
      return {
        session: safeSession(existing, task),
        replayed: true,
      };
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
    input: SubmitToeicSpeakingDto,
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
    if (session.status !== 'ACTIVE') {
      const existing = await this.repository.findSubmissionByIdempotency(
        principal.applicationUserId,
        key,
      );
      if (existing && this.sameSubmission(existing, sessionId, input)) {
        return { session: safeSession(session, task), replayed: true };
      }
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.CONFLICT);
    }
    if (
      input.responseMode !== task.responseMode ||
      input.durationSeconds > (task.durationSeconds ?? 3600)
    ) {
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.INVALID_CONTENT);
    }

    try {
      const result = await this.repository.finalizeWithSubmission(
        {
          sessionId,
          userId: principal.applicationUserId,
          idempotencyKey: key,
          responseMode: input.responseMode,
          durationSeconds: input.durationSeconds,
          sizeBytes: input.sizeBytes,
          submissionReference: input.submissionReference.trim(),
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
          this.sameSubmission(existing, sessionId, input)
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
        this.sameSubmission(existing, sessionId, input)
      ) {
        return { session: safeSession(current, task), replayed: true };
      }
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.CONFLICT);
    }
  }

  private sameSubmission(
    submission: SpeakingSubmissionRecord,
    sessionId: string,
    input: SubmitToeicSpeakingDto,
  ) {
    return (
      submission.sessionId === sessionId &&
      submission.responseMode === input.responseMode &&
      submission.durationSeconds === input.durationSeconds &&
      submission.sizeBytes === input.sizeBytes &&
      submission.submissionReference === input.submissionReference.trim()
    );
  }
}
