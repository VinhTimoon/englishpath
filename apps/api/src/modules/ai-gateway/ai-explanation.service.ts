import {
  ConflictException,
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { ApplicationPrincipal } from '../access';
import {
  AI_FEEDBACK_DAILY_QUOTA,
  AI_FEEDBACK_USAGE_REPOSITORY,
  type AdvisoryFeedback,
  type AiFeedbackUsageRepository,
  type FeedbackUsageRecord,
} from './ai-feedback.models';
import { safeFeedback } from './ai-feedback.service';
import {
  AI_EXPLANATION_ADAPTER_KIND,
  AI_EXPLANATION_MODEL_VERSION,
  AI_EXPLANATION_FEATURE,
  AI_EXPLANATION_POLICY_VERSION,
  AI_EXPLANATION_PROMPT_VERSION,
  AI_EXPLANATION_SKILL,
  type AiExplanationSource,
  type SafeExplanationResponse,
} from './ai-explanation.models';
import type { AiExplanationRequestDto } from './ai-explanation.dto';
import { PRACTICE_REPOSITORY } from '../practice/practice.models';
import type { PracticeExplanationRepository } from '../practice/practice.ports';
import type { ErrorNotebookExplanation } from '../practice/practice.models';

const TOKEN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const NEXT_STEPS = ['Review this explanation, then retry a similar question.'];
const UNSAFE_EXPLANATION_TEXT =
  /correct\s+(?:answer|option|choice)|(?:selected|chosen|your)\s+(?:answer|option|choice)|(?:raw|full|verbatim)\s+submission|\bsubmission(?:\s+content|\s*:)|\banswer\s*(?:is|:)\s*[A-H]\b|\boption\s*(?:is|:)\s*[A-H]\b/i;

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

function fingerprint(input: AiExplanationRequestDto) {
  return createHash('sha256')
    .update(
      JSON.stringify({
        feature: AI_EXPLANATION_FEATURE,
        source: input.source,
        questionId: input.questionId,
        promptVersion: AI_EXPLANATION_PROMPT_VERSION,
      }),
    )
    .digest('hex');
}

function safeExplanation(explanation: unknown): AdvisoryFeedback | null {
  if (typeof explanation !== 'string') return null;
  const summary = explanation.trim();
  if (!summary || UNSAFE_EXPLANATION_TEXT.test(summary)) return null;
  return safeFeedback({
    advisoryOnly: true,
    summary,
    strengths: [],
    nextSteps: NEXT_STEPS,
  });
}

function safeResponse(
  record: FeedbackUsageRecord,
  source: AiExplanationSource,
): SafeExplanationResponse {
  const feedback =
    record.outcome === 'ALLOWED' ? safeFeedback(record.feedback) : null;
  return {
    outcome:
      record.outcome === 'ALLOWED' && !feedback
        ? 'PROVIDER_UNAVAILABLE'
        : record.outcome,
    policyVersion: AI_EXPLANATION_POLICY_VERSION,
    promptVersion: AI_EXPLANATION_PROMPT_VERSION,
    source,
    quotaRemaining: record.quotaRemaining,
    feedback,
  };
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

@Injectable()
export class AiExplanationGatewayService {
  constructor(
    @Inject(AI_FEEDBACK_USAGE_REPOSITORY)
    private readonly usage: AiFeedbackUsageRepository,
    @Inject(PRACTICE_REPOSITORY)
    private readonly practice: PracticeExplanationRepository,
  ) {}

  async request(
    principal: ApplicationPrincipal,
    input: AiExplanationRequestDto,
    idempotencyKey: string | undefined,
    correlationId: string,
  ) {
    const key = requireKey(idempotencyKey);
    this.assertContract(input);
    const requestFingerprint = fingerprint(input);
    const existing = await this.usage.findByIdempotency(
      principal.applicationUserId,
      key,
    );
    if (existing) {
      if (existing.requestFingerprint !== requestFingerprint) {
        throw new ConflictException(
          'The explanation request conflicts with an existing idempotency key.',
        );
      }
      return {
        explanation: safeResponse(existing, input.source),
        replayed: true,
      };
    }
    const claimed = await this.usage.findAnyByIdempotency(key);
    if (claimed) {
      throw new ConflictException(
        'The explanation request conflicts with an existing idempotency key.',
      );
    }

    const count = await this.usage.countSince(
      principal.applicationUserId,
      utcDayStart(new Date()),
    );
    const quotaRemaining = Math.max(0, AI_FEEDBACK_DAILY_QUOTA - count - 1);
    let outcome: FeedbackUsageRecord['outcome'] = 'PROVIDER_UNAVAILABLE';
    let feedback: AdvisoryFeedback | null = null;
    if (count < AI_FEEDBACK_DAILY_QUOTA) {
      let grounding: ErrorNotebookExplanation | null = null;
      try {
        grounding = await this.practice.findErrorNotebookExplanation(
          principal.applicationUserId,
          input.source,
          input.questionId,
        );
      } catch {
        grounding = null;
      }
      const matchesRequest =
        grounding?.source === input.source &&
        grounding.questionId === input.questionId;
      feedback = matchesRequest
        ? safeExplanation(grounding?.explanation)
        : null;
      if (feedback) outcome = 'ALLOWED';
    } else {
      outcome = 'DENIED';
    }

    try {
      const created = await this.usage.create({
        userId: principal.applicationUserId,
        feature: AI_EXPLANATION_FEATURE,
        skill: AI_EXPLANATION_SKILL,
        policyVersion: AI_EXPLANATION_POLICY_VERSION,
        promptVersion: AI_EXPLANATION_PROMPT_VERSION,
        adapterKind: AI_EXPLANATION_ADAPTER_KIND,
        modelVersion: AI_EXPLANATION_MODEL_VERSION,
        idempotencyKey: key,
        requestFingerprint,
        outcome,
        estimatedCostMicros: 0,
        quotaRemaining,
        feedback,
        correlationId,
      });
      return {
        explanation: safeResponse(created, input.source),
        replayed: false,
      };
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      const replay = await this.usage.findByIdempotency(
        principal.applicationUserId,
        key,
      );
      if (replay && replay.requestFingerprint === requestFingerprint) {
        return {
          explanation: safeResponse(replay, input.source),
          replayed: true,
        };
      }
      throw new ConflictException(
        'The explanation request conflicts with an existing idempotency key.',
      );
    }
  }

  private assertContract(input: AiExplanationRequestDto) {
    if (
      (input.source !== 'PRACTICE' && input.source !== 'TOEIC_TIMED_TEST') ||
      typeof input.questionId !== 'string' ||
      !TOKEN.test(input.questionId)
    ) {
      throw new UnprocessableEntityException(
        'The explanation contract is invalid.',
      );
    }
  }
}
