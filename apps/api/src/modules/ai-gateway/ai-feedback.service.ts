import {
  ConflictException,
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { ApplicationPrincipal } from '../access';
import type { AiFeedbackRequestDto } from './ai-feedback.dto';
import {
  AI_FEEDBACK_ADAPTER,
  AI_FEEDBACK_ADAPTER_KIND,
  AI_FEEDBACK_DAILY_QUOTA,
  AI_FEEDBACK_MODEL_VERSION,
  AI_FEEDBACK_POLICY_VERSION,
  AI_FEEDBACK_PROMPT_VERSION,
  AI_FEEDBACK_USAGE_REPOSITORY,
  type AdvisoryFeedback,
  type AiFeedbackAdapter,
  type FeedbackAdapterResult,
  type FeedbackUsageRecord,
  type SafeFeedbackResponse,
  type AiFeedbackUsageRepository,
} from './ai-feedback.models';

const TOKEN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const ALLOWED_FEEDBACK_KEYS = new Set([
  'advisoryOnly',
  'summary',
  'strengths',
  'nextSteps',
]);
const UNSAFE_FEEDBACK_TEXT =
  /provider|credential|secret|api[-_ ]?key|token|rubric|official score|raw response/i;

function isBoundedStringList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'string' && item.length <= 200)
  );
}

function requireKey(value: string | undefined) {
  if (!value || !TOKEN.test(value)) {
    throw new UnprocessableEntityException(
      'An Idempotency-Key header is required.',
    );
  }
  return value;
}

function utcDayStart(now: Date) {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

function fingerprint(input: AiFeedbackRequestDto) {
  return createHash('sha256')
    .update(
      JSON.stringify({
        feature: input.feature,
        skill: input.skill,
        promptVersion: input.promptVersion,
        taskId: input.taskId,
        inputText: input.inputText.trim(),
      }),
    )
    .digest('hex');
}

function unavailableFingerprint(input: {
  feature: string;
  skill: string;
  promptVersion: string;
  taskId: string;
  inputReference: string;
}) {
  return createHash('sha256')
    .update(
      JSON.stringify({
        feature: input.feature,
        skill: input.skill,
        promptVersion: input.promptVersion,
        taskId: input.taskId,
        inputReference: input.inputReference,
      }),
    )
    .digest('hex');
}

function safeFeedback(value: unknown): AdvisoryFeedback | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (
    Object.keys(candidate).some((key) => !ALLOWED_FEEDBACK_KEYS.has(key)) ||
    candidate.advisoryOnly !== true ||
    typeof candidate.summary !== 'string' ||
    candidate.summary.length === 0 ||
    candidate.summary.length > 500 ||
    !isBoundedStringList(candidate.strengths) ||
    !isBoundedStringList(candidate.nextSteps) ||
    candidate.strengths.length > 3 ||
    candidate.nextSteps.length > 3 ||
    UNSAFE_FEEDBACK_TEXT.test(candidate.summary) ||
    candidate.strengths.some((item) => UNSAFE_FEEDBACK_TEXT.test(item)) ||
    candidate.nextSteps.some((item) => UNSAFE_FEEDBACK_TEXT.test(item))
  ) {
    return null;
  }
  return {
    advisoryOnly: true,
    summary: candidate.summary,
    strengths: [...candidate.strengths],
    nextSteps: [...candidate.nextSteps],
  };
}

function normalizedAdapterResult(result: FeedbackAdapterResult) {
  if (result.outcome === 'ALLOWED') {
    const feedback = safeFeedback(result.feedback);
    return feedback
      ? { outcome: 'ALLOWED' as const, feedback }
      : { outcome: 'PROVIDER_UNAVAILABLE' as const, feedback: null };
  }
  if (result.outcome === 'PROVIDER_UNAVAILABLE' && result.feedback === null) {
    return result;
  }
  return { outcome: 'PROVIDER_UNAVAILABLE' as const, feedback: null };
}

function safeResponse(record: FeedbackUsageRecord): SafeFeedbackResponse {
  return {
    outcome: record.outcome,
    policyVersion: record.policyVersion,
    promptVersion: record.promptVersion,
    feature: record.feature,
    skill: record.skill,
    quotaRemaining: record.quotaRemaining,
    feedback: record.feedback,
  };
}

@Injectable()
export class AiFeedbackGatewayService {
  constructor(
    @Inject(AI_FEEDBACK_USAGE_REPOSITORY)
    private readonly repository: AiFeedbackUsageRepository,
    @Inject(AI_FEEDBACK_ADAPTER)
    private readonly adapter: AiFeedbackAdapter,
  ) {}

  async request(
    principal: ApplicationPrincipal,
    input: AiFeedbackRequestDto,
    idempotencyKey: string | undefined,
    correlationId: string,
  ) {
    const key = requireKey(idempotencyKey);
    this.assertContract(input);
    const requestFingerprint = fingerprint(input);
    const existing = await this.repository.findByIdempotency(
      principal.applicationUserId,
      key,
    );
    if (existing) {
      if (existing.requestFingerprint !== requestFingerprint) {
        throw new ConflictException(
          'The feedback request conflicts with an existing idempotency key.',
        );
      }
      return { feedback: safeResponse(existing), replayed: true };
    }

    const count = await this.repository.countSince(
      principal.applicationUserId,
      utcDayStart(new Date()),
    );
    const quotaRemaining = Math.max(0, AI_FEEDBACK_DAILY_QUOTA - count - 1);
    const adapterResult =
      count >= AI_FEEDBACK_DAILY_QUOTA
        ? { outcome: 'DENIED' as const, feedback: null }
        : normalizedAdapterResult(
            await this.adapter.generate({
              feature: input.feature,
              skill: input.skill,
              promptVersion: input.promptVersion,
              taskId: input.taskId,
              inputText: input.inputText.trim(),
            }),
          );

    try {
      const created = await this.repository.create({
        userId: principal.applicationUserId,
        feature: input.feature,
        skill: input.skill,
        policyVersion: AI_FEEDBACK_POLICY_VERSION,
        promptVersion: input.promptVersion,
        adapterKind: AI_FEEDBACK_ADAPTER_KIND,
        modelVersion: AI_FEEDBACK_MODEL_VERSION,
        idempotencyKey: key,
        requestFingerprint,
        outcome: adapterResult.outcome,
        estimatedCostMicros: 0,
        quotaRemaining,
        feedback: adapterResult.feedback,
        correlationId,
      });
      return { feedback: safeResponse(created), replayed: false };
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      const replay = await this.repository.findByIdempotency(
        principal.applicationUserId,
        key,
      );
      if (replay && replay.requestFingerprint === requestFingerprint) {
        return { feedback: safeResponse(replay), replayed: true };
      }
      throw new ConflictException(
        'The feedback request conflicts with an existing idempotency key.',
      );
    }
  }

  async requestUnavailable(
    principal: ApplicationPrincipal,
    input: {
      feature: 'SPEAKING';
      skill: 'SPEAKING';
      promptVersion: string;
      taskId: string;
      inputReference: string;
    },
    idempotencyKey: string | undefined,
    correlationId: string,
  ) {
    const key = requireKey(idempotencyKey);
    this.assertSharedContract(
      input.feature,
      input.skill,
      input.promptVersion,
      input.taskId,
    );
    if (!TOKEN.test(input.inputReference)) {
      throw new UnprocessableEntityException(
        'The feedback input reference is invalid.',
      );
    }
    const requestFingerprint = unavailableFingerprint(input);
    const existing = await this.repository.findByIdempotency(
      principal.applicationUserId,
      key,
    );
    if (existing) {
      if (existing.requestFingerprint !== requestFingerprint) {
        throw new ConflictException(
          'The feedback request conflicts with an existing idempotency key.',
        );
      }
      return { feedback: safeResponse(existing), replayed: true };
    }

    const count = await this.repository.countSince(
      principal.applicationUserId,
      utcDayStart(new Date()),
    );
    const quotaRemaining = Math.max(0, AI_FEEDBACK_DAILY_QUOTA - count - 1);
    const outcome =
      count >= AI_FEEDBACK_DAILY_QUOTA
        ? ('DENIED' as const)
        : ('PROVIDER_UNAVAILABLE' as const);

    try {
      const created = await this.repository.create({
        userId: principal.applicationUserId,
        feature: input.feature,
        skill: input.skill,
        policyVersion: AI_FEEDBACK_POLICY_VERSION,
        promptVersion: input.promptVersion,
        adapterKind: AI_FEEDBACK_ADAPTER_KIND,
        modelVersion: AI_FEEDBACK_MODEL_VERSION,
        idempotencyKey: key,
        requestFingerprint,
        outcome,
        estimatedCostMicros: 0,
        quotaRemaining,
        feedback: null,
        correlationId,
      });
      return { feedback: safeResponse(created), replayed: false };
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      const replay = await this.repository.findByIdempotency(
        principal.applicationUserId,
        key,
      );
      if (replay && replay.requestFingerprint === requestFingerprint) {
        return { feedback: safeResponse(replay), replayed: true };
      }
      throw new ConflictException(
        'The feedback request conflicts with an existing idempotency key.',
      );
    }
  }

  private assertContract(input: AiFeedbackRequestDto) {
    this.assertSharedContract(
      input.feature,
      input.skill,
      input.promptVersion,
      input.taskId,
    );
    if (
      typeof input.inputText !== 'string' ||
      input.inputText.trim().length === 0 ||
      input.inputText.length > 4000
    ) {
      throw new UnprocessableEntityException(
        'The feedback contract is invalid.',
      );
    }
  }

  private assertSharedContract(
    feature: string,
    skill: string,
    promptVersion: string,
    taskId: string,
  ) {
    if (
      (feature !== 'SPEAKING' && feature !== 'WRITING') ||
      (skill !== 'SPEAKING' && skill !== 'WRITING') ||
      feature !== skill ||
      promptVersion !== AI_FEEDBACK_PROMPT_VERSION ||
      !TOKEN.test(taskId)
    ) {
      throw new UnprocessableEntityException(
        'The feedback contract is invalid.',
      );
    }
  }
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}
