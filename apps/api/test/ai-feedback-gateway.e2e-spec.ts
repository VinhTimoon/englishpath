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
import { PrismaService } from '../src/prisma/prisma.service';

describe('AI feedback gateway vertical slice (e2e)', () => {
  let app: INestApplication<App>;
  const external = createExternalIdentity({
    provider: 'SUPABASE',
    subject: 'feedback-e2e-user',
    issuer: 'issuer',
    audience: 'authenticated',
  });
  const principal = createApplicationPrincipal({
    applicationUserId: 'feedback-e2e-owner',
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
          id: 'usage-e2e',
          createdAt: new Date('2026-08-10T00:00:00.000Z'),
          ...value,
        }) as FeedbackUsageRecord,
    ),
  };
  const adapter: jest.Mocked<AiFeedbackAdapter> = {
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

  beforeEach(async () => {
    repository.findByIdempotency.mockResolvedValue(null);
    repository.countSince.mockResolvedValue(0);
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
      .compile();
    app = module.createNestApplication();
    await app.init();
  });

  it('accepts authenticated safe feedback and exact replay without raw input', async () => {
    const payload = {
      feature: 'WRITING',
      skill: 'WRITING',
      promptVersion: 'local-fixture-v1',
      taskId: 'task-001',
      inputText: 'A bounded learner response.',
    };
    const response = await request(app.getHttpServer())
      .post('/api/v1/ai-gateway/feedback')
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'feedback-e2e')
      .send(payload)
      .expect(200);
    const body = response.body as {
      data: { feedback: { outcome: string; feedback: unknown } };
    };
    expect(body.data.feedback.outcome).toBe('ALLOWED');
    expect(JSON.stringify(response.body)).not.toMatch(
      /provider|credential|raw|score|rubric|bounded learner/i,
    );
    expect(repository.create.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        userId: principal.applicationUserId,
        estimatedCostMicros: 0,
      }),
    );

    const saved = repository.create.mock.calls[0]?.[0] as Omit<
      FeedbackUsageRecord,
      'id' | 'createdAt'
    >;
    repository.findByIdempotency.mockResolvedValue({
      id: 'usage-e2e',
      createdAt: new Date('2026-08-10T00:00:00.000Z'),
      ...saved,
    });
    const replay = await request(app.getHttpServer())
      .post('/api/v1/ai-gateway/feedback')
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'feedback-e2e')
      .send(payload)
      .expect(200);
    expect(
      (replay.body as { meta: { idempotencyStatus: string } }).meta
        .idempotencyStatus,
    ).toBe('replayed');
  });

  it('rejects malformed input and makes quota denial explicit', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/ai-gateway/feedback')
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'feedback-invalid')
      .send({
        feature: 'WRITING',
        skill: 'SPEAKING',
        promptVersion: 'local-fixture-v1',
        taskId: 'task-001',
        inputText: 'x',
      })
      .expect(422);
    repository.countSince.mockResolvedValue(10);
    const response = await request(app.getHttpServer())
      .post('/api/v1/ai-gateway/feedback')
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'feedback-denied')
      .send({
        feature: 'WRITING',
        skill: 'WRITING',
        promptVersion: 'local-fixture-v1',
        taskId: 'task-001',
        inputText: 'A bounded learner response.',
      })
      .expect(200);
    expect(
      (
        response.body as {
          data: { feedback: { outcome: string; quotaRemaining: number } };
        }
      ).data.feedback,
    ).toEqual(
      expect.objectContaining({ outcome: 'DENIED', quotaRemaining: 0 }),
    );
    expect(adapter.generate.mock.calls).toHaveLength(0);
  });
});
