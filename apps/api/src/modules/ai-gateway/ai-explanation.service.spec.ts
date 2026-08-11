/* eslint-disable @typescript-eslint/unbound-method */
import {
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createApplicationPrincipal, createExternalIdentity } from '../access';
import type {
  AiFeedbackUsageRepository,
  FeedbackUsageCreate,
  FeedbackUsageRecord,
} from './ai-feedback.models';
import type { AiExplanationRequestDto } from './ai-explanation.dto';
import { AiExplanationGatewayService } from './ai-explanation.service';
import type { PracticeExplanationRepository } from '../practice/practice.ports';

const principal = createApplicationPrincipal({
  applicationUserId: 'explanation-owner',
  externalIdentity: createExternalIdentity({
    provider: 'SUPABASE',
    subject: 'explanation-subject',
    issuer: 'issuer',
    audience: 'authenticated',
  }),
  roles: ['FREE_USER'],
  ownerships: [],
  entitlements: [],
});

const input: AiExplanationRequestDto = {
  source: 'PRACTICE',
  questionId: 'p2',
};

function record(value: Partial<FeedbackUsageRecord> = {}): FeedbackUsageRecord {
  return {
    id: 'usage-explanation-001',
    userId: principal.applicationUserId,
    feature: 'EXPLANATION',
    skill: 'EXPLANATION',
    policyVersion: 'explanation-gateway-v1',
    promptVersion: 'grounded-notebook-v1',
    adapterKind: 'LOCAL_NOOP',
    modelVersion: 'local-noop-v1',
    idempotencyKey: 'explanation-001',
    requestFingerprint: 'fingerprint',
    outcome: 'ALLOWED',
    estimatedCostMicros: 0,
    quotaRemaining: 9,
    feedback: {
      advisoryOnly: true,
      summary: 'Review the persisted explanation.',
      strengths: [],
      nextSteps: ['Review this explanation, then retry a similar question.'],
    },
    correlationId: 'corr-explanation-001',
    createdAt: new Date('2026-08-11T00:00:00.000Z'),
    ...value,
  };
}

describe('AiExplanationGatewayService', () => {
  let usage: jest.Mocked<AiFeedbackUsageRepository>;
  let practice: jest.Mocked<PracticeExplanationRepository>;
  let service: AiExplanationGatewayService;

  beforeEach(() => {
    usage = {
      findByIdempotency: jest.fn().mockResolvedValue(null),
      findAnyByIdempotency: jest.fn().mockResolvedValue(null),
      countSince: jest.fn().mockResolvedValue(0),
      create: jest
        .fn()
        .mockImplementation((value: FeedbackUsageCreate) =>
          Promise.resolve(record(value)),
        ),
    };
    practice = {
      findErrorNotebookExplanation: jest.fn().mockResolvedValue({
        source: 'PRACTICE',
        questionId: 'p2',
        explanation: 'Use the past form after this time marker.',
      }),
    };
    service = new AiExplanationGatewayService(usage, practice);
  });

  it('returns only a grounded advisory projection and zero-cost evidence', async () => {
    const result = await service.request(
      principal,
      input,
      'explanation-001',
      'corr-explanation-001',
    );

    expect(result.explanation).toEqual({
      outcome: 'ALLOWED',
      policyVersion: 'explanation-gateway-v1',
      promptVersion: 'grounded-notebook-v1',
      source: 'PRACTICE',
      quotaRemaining: 9,
      feedback: {
        advisoryOnly: true,
        summary: 'Use the past form after this time marker.',
        strengths: [],
        nextSteps: ['Review this explanation, then retry a similar question.'],
      },
    });
    expect(JSON.stringify(result)).not.toMatch(
      /questionId|selectedOption|correctOption|provider|credential|official score/i,
    );
    expect(usage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: principal.applicationUserId,
        feature: 'EXPLANATION',
        skill: 'EXPLANATION',
        estimatedCostMicros: 0,
        correlationId: 'corr-explanation-001',
      }),
    );
    expect(practice.findErrorNotebookExplanation).toHaveBeenCalledWith(
      principal.applicationUserId,
      'PRACTICE',
      'p2',
    );
  });

  it('fails closed when the repository returns a mismatched reference', async () => {
    practice.findErrorNotebookExplanation.mockResolvedValueOnce({
      source: 'TOEIC_TIMED_TEST',
      questionId: 'other-question',
      explanation: 'This must not be returned for the requested reference.',
    });

    const result = await service.request(
      principal,
      input,
      'explanation-mismatch',
      'corr-mismatch',
    );

    expect(result.explanation).toEqual(
      expect.objectContaining({
        outcome: 'PROVIDER_UNAVAILABLE',
        feedback: null,
      }),
    );
  });

  it('revalidates persisted feedback on exact replay', async () => {
    await service.request(
      principal,
      input,
      'explanation-fingerprint',
      'corr-fingerprint',
    );
    const created = usage.create.mock.calls.at(-1)?.[0];
    usage.findByIdempotency.mockResolvedValueOnce(
      record({
        idempotencyKey: 'explanation-unsafe-replay',
        requestFingerprint: created!.requestFingerprint,
        feedback: {
          advisoryOnly: true,
          summary: 'provider credential must not escape',
          strengths: [],
          nextSteps: [],
        },
      }),
    );

    const result = await service.request(
      principal,
      input,
      'explanation-unsafe-replay',
      'corr-unsafe-replay',
    );

    expect(result.explanation).toEqual(
      expect.objectContaining({
        outcome: 'PROVIDER_UNAVAILABLE',
        feedback: null,
      }),
    );
  });

  it('fails closed with an explicit unavailable result for missing or malformed grounding', async () => {
    practice.findErrorNotebookExplanation.mockResolvedValueOnce(null);
    const missing = await service.request(
      principal,
      input,
      'explanation-missing',
      'corr-missing',
    );
    expect(missing.explanation).toEqual(
      expect.objectContaining({
        outcome: 'PROVIDER_UNAVAILABLE',
        feedback: null,
      }),
    );

    practice.findErrorNotebookExplanation.mockResolvedValueOnce({
      source: 'PRACTICE',
      questionId: 'p2',
      explanation:
        'The correct answer is B; provider credential must not escape',
    });
    const malformed = await service.request(
      principal,
      input,
      'explanation-malformed',
      'corr-malformed',
    );
    expect(malformed.explanation.feedback).toBeNull();
    expect(malformed.explanation.outcome).toBe('PROVIDER_UNAVAILABLE');
  });

  it('fails closed for answer-bearing or submission-bearing explanations', async () => {
    for (const explanation of [
      'The correct answer is B.',
      'Your selected option was C.',
      'Raw submission: option D.',
    ]) {
      practice.findErrorNotebookExplanation.mockResolvedValueOnce({
        source: 'PRACTICE',
        questionId: 'p2',
        explanation,
      });

      const result = await service.request(
        principal,
        input,
        `explanation-unsafe-${explanation.charCodeAt(4)}`,
        'corr-unsafe',
      );

      expect(result.explanation.outcome).toBe('PROVIDER_UNAVAILABLE');
      expect(result.explanation.feedback).toBeNull();
    }
  });

  it('does not resolve grounding after the UTC-day quota is exhausted', async () => {
    usage.countSince.mockResolvedValue(10);
    const result = await service.request(
      principal,
      input,
      'explanation-denied',
      'corr-denied',
    );
    expect(result.explanation).toEqual(
      expect.objectContaining({
        outcome: 'DENIED',
        quotaRemaining: 0,
        feedback: null,
      }),
    );
    expect(practice.findErrorNotebookExplanation).not.toHaveBeenCalled();
  });

  it('replays exact requests, conflicts on changed requests, and rejects another owner claim', async () => {
    await service.request(principal, input, 'explanation-replay', 'corr-first');
    const created = usage.create.mock.calls[0]?.[0];
    usage.findByIdempotency.mockResolvedValue(
      record({
        ...created,
        idempotencyKey: 'explanation-replay',
        requestFingerprint: created.requestFingerprint,
      }),
    );
    const replay = await service.request(
      principal,
      input,
      'explanation-replay',
      'corr-replay',
    );
    expect(replay.replayed).toBe(true);
    expect(practice.findErrorNotebookExplanation).toHaveBeenCalledTimes(1);

    await expect(
      service.request(
        principal,
        { ...input, questionId: 'p3' },
        'explanation-replay',
        'corr-conflict',
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    usage.findByIdempotency.mockResolvedValue(null);
    usage.findAnyByIdempotency.mockResolvedValue(
      record({ userId: 'another-owner', idempotencyKey: 'explanation-other' }),
    );
    await expect(
      service.request(
        principal,
        input,
        'explanation-other',
        'corr-owner-conflict',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('requires a bounded idempotency key and question reference', async () => {
    await expect(
      service.request(principal, input, undefined, 'corr'),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(
      service.request(
        principal,
        { source: 'PRACTICE', questionId: 'bad question' },
        'explanation-invalid',
        'corr',
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});
