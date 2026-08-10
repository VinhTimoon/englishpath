import { ConflictException } from '@nestjs/common';
import { createApplicationPrincipal, createExternalIdentity } from '../access';
import type { AiFeedbackRequestDto } from './ai-feedback.dto';
import type {
  AiFeedbackAdapter,
  AiFeedbackUsageRepository,
  FeedbackUsageCreate,
  FeedbackUsageRecord,
} from './ai-feedback.models';
import { AiFeedbackGatewayService } from './ai-feedback.service';

const principal = createApplicationPrincipal({
  applicationUserId: 'feedback-owner',
  externalIdentity: createExternalIdentity({
    provider: 'SUPABASE',
    subject: 'feedback-subject',
    issuer: 'issuer',
    audience: 'authenticated',
  }),
  roles: ['FREE_USER'],
  ownerships: [],
  entitlements: [],
});
const input: AiFeedbackRequestDto = {
  feature: 'WRITING',
  skill: 'WRITING',
  promptVersion: 'local-fixture-v1',
  taskId: 'task-001',
  inputText: 'A bounded learner response.',
};

function record(
  overrides: Partial<FeedbackUsageRecord> = {},
): FeedbackUsageRecord {
  return {
    id: 'usage-001',
    userId: principal.applicationUserId,
    feature: 'WRITING',
    skill: 'WRITING',
    policyVersion: 'feedback-gateway-v1',
    promptVersion: 'local-fixture-v1',
    adapterKind: 'LOCAL_NOOP',
    modelVersion: 'local-noop-v1',
    idempotencyKey: 'feedback-001',
    requestFingerprint: 'fingerprint',
    outcome: 'ALLOWED',
    estimatedCostMicros: 0,
    quotaRemaining: 9,
    feedback: {
      advisoryOnly: true,
      summary: 'Safe local feedback.',
      strengths: ['Completed a response.'],
      nextSteps: ['Keep practicing.'],
    },
    correlationId: 'corr-0001',
    createdAt: new Date('2026-08-10T00:00:00.000Z'),
    ...overrides,
  };
}

describe('AiFeedbackGatewayService', () => {
  let repository: jest.Mocked<AiFeedbackUsageRepository>;
  let adapter: jest.Mocked<AiFeedbackAdapter>;
  let service: AiFeedbackGatewayService;

  beforeEach(() => {
    repository = {
      findByIdempotency: jest.fn().mockResolvedValue(null),
      countSince: jest.fn().mockResolvedValue(0),
      create: jest
        .fn()
        .mockImplementation((value: FeedbackUsageCreate) => record(value)),
    };
    adapter = {
      generate: jest.fn().mockResolvedValue({
        outcome: 'ALLOWED',
        feedback: {
          advisoryOnly: true,
          summary: 'Safe local feedback.',
          strengths: ['Completed a response.'],
          nextSteps: ['Keep practicing.'],
        },
      }),
    };
    service = new AiFeedbackGatewayService(repository, adapter);
  });

  it('allows a deterministic local request with zero cost and safe output', async () => {
    const result = await service.request(
      principal,
      input,
      'feedback-001',
      'corr-0001',
    );
    expect(result.replayed).toBe(false);
    expect(result.feedback).toEqual(
      expect.objectContaining({
        outcome: 'ALLOWED',
        policyVersion: 'feedback-gateway-v1',
        quotaRemaining: 9,
      }),
    );
    expect(JSON.stringify(result)).not.toContain(input.inputText);
    expect(repository.create.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        userId: principal.applicationUserId,
        estimatedCostMicros: 0,
      }),
    );
  });

  it('denies after ten UTC-day attempts without calling the adapter', async () => {
    repository.countSince.mockResolvedValue(10);
    const result = await service.request(
      principal,
      input,
      'feedback-001',
      'corr-0001',
    );
    expect(result.feedback.outcome).toBe('DENIED');
    expect(result.feedback.quotaRemaining).toBe(0);
    expect(adapter.generate.mock.calls).toHaveLength(0);
  });

  it('replays exact idempotency and conflicts on changed payloads', async () => {
    const first = await service.request(
      principal,
      input,
      'feedback-001',
      'corr-0001',
    );
    const created = repository.create.mock.calls[0]?.[0];
    const saved = record({ requestFingerprint: created.requestFingerprint });
    repository.findByIdempotency.mockResolvedValue(saved);
    const replay = await service.request(
      principal,
      input,
      'feedback-001',
      'corr-other',
    );
    expect(replay.replayed).toBe(true);
    expect(replay.feedback.outcome).toBe('ALLOWED');
    await expect(
      service.request(
        principal,
        { ...input, inputText: 'changed' },
        'feedback-001',
        'corr-other',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(first.feedback).toEqual(
      expect.objectContaining({ outcome: 'ALLOWED' }),
    );
  });

  it('fails closed when the adapter is unavailable or unsafe', async () => {
    adapter.generate.mockResolvedValue({
      outcome: 'PROVIDER_UNAVAILABLE',
      feedback: null,
    });
    const result = await service.request(
      principal,
      input,
      'feedback-002',
      'corr-0002',
    );
    expect(result.feedback).toEqual(
      expect.objectContaining({
        outcome: 'PROVIDER_UNAVAILABLE',
        feedback: null,
      }),
    );
    adapter.generate.mockResolvedValue({
      outcome: 'ALLOWED',
      feedback: {
        advisoryOnly: true,
        summary: 'provider secret must not escape',
        strengths: [],
        nextSteps: [],
      },
    });
    const unsafe = await service.request(
      principal,
      input,
      'feedback-003',
      'corr-0003',
    );
    expect(unsafe.feedback.feedback).toBeNull();
    expect(unsafe.feedback.outcome).toBe('PROVIDER_UNAVAILABLE');
  });
});
