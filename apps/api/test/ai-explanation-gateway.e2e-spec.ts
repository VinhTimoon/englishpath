/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-member-access */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import {
  createApplicationPrincipal,
  createExternalIdentity,
} from '../src/modules/access';
import {
  APPLICATION_PRINCIPAL_RESOLVER,
  EXTERNAL_IDENTITY_VERIFIER,
} from '../src/modules/auth/auth.tokens';
import {
  AI_FEEDBACK_ADAPTER,
  AI_FEEDBACK_USAGE_REPOSITORY,
  type AiFeedbackAdapter,
  type AiFeedbackUsageRepository,
  type FeedbackUsageRecord,
} from '../src/modules/ai-gateway/ai-feedback.models';
import { PRACTICE_REPOSITORY } from '../src/modules/practice/practice.models';
import type { PracticeExplanationRepository } from '../src/modules/practice/practice.ports';
import { PrismaService } from '../src/prisma/prisma.service';

describe('AI explanation gateway vertical slice (e2e)', () => {
  let app: INestApplication<App>;
  const external = createExternalIdentity({
    provider: 'SUPABASE',
    subject: 'explanation-e2e-user',
    issuer: 'issuer',
    audience: 'authenticated',
  });
  const principal = createApplicationPrincipal({
    applicationUserId: 'explanation-e2e-owner',
    externalIdentity: external,
    roles: ['FREE_USER'],
    ownerships: [],
    entitlements: [],
  });
  const repository: jest.Mocked<AiFeedbackUsageRepository> = {
    findByIdempotency: jest.fn().mockResolvedValue(null),
    findAnyByIdempotency: jest.fn().mockResolvedValue(null),
    countSince: jest.fn().mockResolvedValue(0),
    create: jest.fn().mockImplementation(
      (value) =>
        ({
          id: 'explanation-usage-e2e',
          createdAt: new Date('2026-08-11T00:00:00.000Z'),
          ...value,
        }) as FeedbackUsageRecord,
    ),
  };
  const practiceRepository: jest.Mocked<PracticeExplanationRepository> = {
    findErrorNotebookExplanation: jest.fn(),
  };
  const adapter: jest.Mocked<AiFeedbackAdapter> = {
    generate: jest.fn(),
  };

  beforeEach(async () => {
    repository.findByIdempotency.mockResolvedValue(null);
    repository.findAnyByIdempotency.mockResolvedValue(null);
    repository.countSince.mockResolvedValue(0);
    repository.create.mockClear();
    practiceRepository.findErrorNotebookExplanation.mockResolvedValue({
      source: 'PRACTICE',
      questionId: 'p2',
      explanation: 'Use the past form after this time marker.',
    });
    adapter.generate.mockClear();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({ $queryRaw: jest.fn().mockResolvedValue([{ result: 1 }]) })
      .overrideProvider(EXTERNAL_IDENTITY_VERIFIER)
      .useValue({ verify: jest.fn().mockResolvedValue(external) })
      .overrideProvider(APPLICATION_PRINCIPAL_RESOLVER)
      .useValue({ resolve: jest.fn().mockResolvedValue(principal) })
      .overrideProvider(AI_FEEDBACK_USAGE_REPOSITORY)
      .useValue(repository)
      .overrideProvider(AI_FEEDBACK_ADAPTER)
      .useValue(adapter)
      .overrideProvider(PRACTICE_REPOSITORY)
      .useValue(practiceRepository)
      .compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('requires authentication and rejects unbounded or unsupported request fields', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/ai-gateway/explanation')
      .send({ source: 'PRACTICE', questionId: 'p2' })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/v1/ai-gateway/explanation')
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'explanation-invalid')
      .send({ source: 'OTHER', questionId: 'p2' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/ai-gateway/explanation')
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'explanation-invalid-fields')
      .send({ source: 'PRACTICE', questionId: 'p2', text: 'client prompt' })
      .expect(400);
  });

  it('returns grounded feedback with owner and safe-field redaction', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/ai-gateway/explanation')
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'explanation-success')
      .set('X-Correlation-Id', 'corr-explanation-e2e')
      .send({ source: 'PRACTICE', questionId: 'p2' })
      .expect(200);

    expect(response.body).toEqual({
      data: {
        outcome: 'ALLOWED',
        policyVersion: 'explanation-gateway-v1',
        promptVersion: 'grounded-notebook-v1',
        source: 'PRACTICE',
        quotaRemaining: 9,
        feedback: {
          advisoryOnly: true,
          summary: 'Use the past form after this time marker.',
          strengths: [],
          nextSteps: [
            'Review this explanation, then retry a similar question.',
          ],
        },
      },
      meta: {
        correlationId: 'corr-explanation-e2e',
        idempotencyStatus: 'created',
      },
    });
    expect(JSON.stringify(response.body)).not.toMatch(
      /questionId|selectedOption|correctOption|provider|credential|official score|client prompt/i,
    );
    expect(
      practiceRepository.findErrorNotebookExplanation,
    ).toHaveBeenCalledWith(principal.applicationUserId, 'PRACTICE', 'p2');
    expect(adapter.generate).not.toHaveBeenCalled();
  });

  it('uses one generated correlation ID for evidence and response metadata', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/ai-gateway/explanation')
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'explanation-generated-correlation')
      .send({ source: 'PRACTICE', questionId: 'p2' })
      .expect(200);

    const created = repository.create.mock.calls.at(-1)?.[0];
    expect(created?.correlationId).toBe(response.body.meta.correlationId);
    expect(response.body.meta.correlationId).toMatch(/^corr-/);
  });

  it('returns explicit unavailable grounding and records quota denial without provider use', async () => {
    practiceRepository.findErrorNotebookExplanation.mockResolvedValue(null);
    const unavailable = await request(app.getHttpServer())
      .post('/api/v1/ai-gateway/explanation')
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'explanation-unavailable')
      .send({ source: 'TOEIC_TIMED_TEST', questionId: 'toeic-version-1' })
      .expect(200);
    expect(unavailable.body.data).toEqual(
      expect.objectContaining({
        outcome: 'PROVIDER_UNAVAILABLE',
        feedback: null,
      }),
    );

    repository.countSince.mockResolvedValue(10);
    const denied = await request(app.getHttpServer())
      .post('/api/v1/ai-gateway/explanation')
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'explanation-quota')
      .send({ source: 'PRACTICE', questionId: 'p2' })
      .expect(200);
    expect(denied.body.data).toEqual(
      expect.objectContaining({
        outcome: 'DENIED',
        quotaRemaining: 0,
        feedback: null,
      }),
    );
    expect(adapter.generate).not.toHaveBeenCalled();
  });

  it('fails closed for answer-bearing persisted explanations', async () => {
    practiceRepository.findErrorNotebookExplanation.mockResolvedValue({
      source: 'PRACTICE',
      questionId: 'p2',
      explanation: 'The correct answer is B.',
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/ai-gateway/explanation')
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'explanation-answer-bearing')
      .send({ source: 'PRACTICE', questionId: 'p2' })
      .expect(200);

    expect(response.body.data).toEqual(
      expect.objectContaining({
        outcome: 'PROVIDER_UNAVAILABLE',
        feedback: null,
      }),
    );
  });

  it('exactly replays and conflicts without returning a previous safe result', async () => {
    const payload = { source: 'PRACTICE', questionId: 'p2' };
    const first = await request(app.getHttpServer())
      .post('/api/v1/ai-gateway/explanation')
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'explanation-replay')
      .send(payload)
      .expect(200);
    const saved = repository.create.mock.calls[0]?.[0];
    repository.findByIdempotency.mockResolvedValue({
      id: 'explanation-usage-e2e',
      createdAt: new Date('2026-08-11T00:00:00.000Z'),
      ...saved,
    });
    const replay = await request(app.getHttpServer())
      .post('/api/v1/ai-gateway/explanation')
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'explanation-replay')
      .send(payload)
      .expect(200);
    expect(replay.body.meta.idempotencyStatus).toBe('replayed');
    expect(replay.body.data).toEqual(first.body.data);

    await request(app.getHttpServer())
      .post('/api/v1/ai-gateway/explanation')
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'explanation-replay')
      .send({ source: 'PRACTICE', questionId: 'p3' })
      .expect(409);

    repository.findByIdempotency.mockResolvedValue(null);
    repository.findAnyByIdempotency.mockResolvedValue({
      id: 'other-owner-usage',
      ...saved,
      userId: 'other-owner',
    } as FeedbackUsageRecord);
    await request(app.getHttpServer())
      .post('/api/v1/ai-gateway/explanation')
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'explanation-replay')
      .send(payload)
      .expect(409);
  });
});
