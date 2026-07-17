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
import { ONBOARDING_REPOSITORY } from '../src/modules/onboarding/onboarding.models';
import type { OnboardingRepository } from '../src/modules/onboarding/onboarding.ports';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Learner entry vertical slice (e2e)', () => {
  let app: INestApplication<App>;
  const external = createExternalIdentity({
    provider: 'SUPABASE',
    subject: 'external-user-001',
    issuer: 'issuer',
    audience: 'authenticated',
  });
  const principal = createApplicationPrincipal({
    applicationUserId: 'application-user-001',
    externalIdentity: external,
    roles: ['FREE_USER'],
    ownerships: [],
    entitlements: [],
  });
  const repository: jest.Mocked<OnboardingRepository> = {
    find: jest.fn(),
    upsert: jest.fn(),
    findLatestPlacement: jest.fn(),
    createPlacement: jest.fn(),
  };

  beforeEach(async () => {
    repository.upsert.mockResolvedValue({
      primaryGoal: 'ENGLISH_FOUNDATION',
      secondaryGoals: ['DAILY_COMMUNICATION'],
      currentLevel: 'BEGINNER',
      dailyMinutes: 20,
      targetDays: 90,
      prioritySkills: ['VOCABULARY', 'LISTENING'],
      completedAt: new Date('2026-07-17T00:00:00Z'),
    });
    repository.createPlacement.mockResolvedValue({
      id: 'attempt-001',
      score: 10,
      total: 10,
      level: 'ADVANCED',
      skillBreakdown: {},
      submittedAt: new Date('2026-07-17T00:00:00Z'),
    });
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({ $queryRaw: jest.fn().mockResolvedValue([{ result: 1 }]) })
      .overrideProvider(EXTERNAL_IDENTITY_VERIFIER)
      .useValue({ verify: jest.fn().mockResolvedValue(external) })
      .overrideProvider(APPLICATION_PRINCIPAL_RESOLVER)
      .useValue({ resolve: jest.fn().mockResolvedValue(principal) })
      .overrideProvider(ONBOARDING_REPOSITORY)
      .useValue(repository)
      .compile();
    app = module.createNestApplication();
    await app.init();
  });

  it('completes onboarding, hides keys, and submits placement idempotency input', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/onboarding')
      .set('Authorization', 'Bearer local.token.value')
      .send({
        primaryGoal: 'ENGLISH_FOUNDATION',
        secondaryGoals: ['DAILY_COMMUNICATION'],
        currentLevel: 'BEGINNER',
        dailyMinutes: 20,
        targetDays: 90,
        prioritySkills: ['VOCABULARY', 'LISTENING'],
      })
      .expect(200);
    expect(repository.upsert.mock.calls[0]?.[0]).toBe('application-user-001');

    const questions = await request(app.getHttpServer())
      .get('/api/v1/placement/questions')
      .set('Authorization', 'Bearer local.token.value')
      .expect(200);
    const questionBody = questions.body as { data: Array<{ id: string }> };
    expect(questionBody.data).toHaveLength(10);
    expect(JSON.stringify(questionBody)).not.toMatch(/answer|correct/i);
    const answers = questionBody.data.map(({ id }) => ({
      questionId: id,
      optionId: 'a',
    }));
    await request(app.getHttpServer())
      .post('/api/v1/placement/submissions')
      .set('Authorization', 'Bearer local.token.value')
      .send({ clientSubmissionId: 'submission-001', answers })
      .expect(201);
    expect(repository.createPlacement.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        userId: 'application-user-001',
        clientSubmissionId: 'submission-001',
      }),
    );
  });

  it('rejects mass assignment and incomplete placement submissions', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/onboarding')
      .set('Authorization', 'Bearer local.token.value')
      .send({
        primaryGoal: 'ENGLISH_FOUNDATION',
        secondaryGoals: [],
        currentLevel: 'BEGINNER',
        dailyMinutes: 20,
        targetDays: 90,
        prioritySkills: [],
        userId: 'attacker',
      })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/placement/submissions')
      .set('Authorization', 'Bearer local.token.value')
      .send({ clientSubmissionId: 'submission-002', answers: [] })
      .expect(400);
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });
});
