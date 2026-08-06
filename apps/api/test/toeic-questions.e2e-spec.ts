import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureOpenApi } from '../src/config/openapi';
import {
  createApplicationPrincipal,
  createExternalIdentity,
} from '../src/modules/access';
import {
  APPLICATION_PRINCIPAL_RESOLVER,
  EXTERNAL_IDENTITY_VERIFIER,
} from '../src/modules/auth/auth.tokens';
import {
  TOEIC_QUESTION_REPOSITORY,
  type SafeToeicQuestion,
  type ToeicQuestionRepository,
} from '../src/modules/toeic/toeic-question.models';
import { PrismaService } from '../src/prisma/prisma.service';

const question: SafeToeicQuestion = {
  id: 'q-1-v1',
  questionId: 'q-1',
  version: 1,
  part: 'PART_1',
  questionType: 'PHOTO_DESCRIPTION',
  difficulty: 'ELEMENTARY',
  topic: 'office',
  stimulusGroup: null,
  prompt: 'A learner-safe question',
  options: [{ id: 'A', text: 'Option A' }],
  mediaReference: null,
  explanation: 'A learner-safe explanation',
};

describe('TOEIC question bank API (e2e)', () => {
  let app: INestApplication<App>;
  const repository: jest.Mocked<ToeicQuestionRepository> = {
    list: jest.fn(),
    find: jest.fn(),
  };
  const externalIdentity = createExternalIdentity({
    provider: 'SUPABASE',
    subject: 'toeic-learner-subject',
    issuer: 'issuer',
    audience: 'audience',
  });
  const principal = createApplicationPrincipal({
    applicationUserId: 'toeic-learner-1',
    externalIdentity,
    roles: ['FREE_USER'],
    ownerships: [],
    entitlements: [],
  });

  beforeEach(async () => {
    repository.list.mockResolvedValue({ items: [question], totalItems: 1 });
    repository.find.mockResolvedValue(question);
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(TOEIC_QUESTION_REPOSITORY)
      .useValue(repository)
      .overrideProvider(EXTERNAL_IDENTITY_VERIFIER)
      .useValue({ verify: jest.fn().mockResolvedValue(externalIdentity) })
      .overrideProvider(APPLICATION_PRINCIPAL_RESOLVER)
      .useValue({ resolve: jest.fn().mockResolvedValue(principal) })
      .compile();
    app = moduleFixture.createNestApplication();
    configureOpenApi(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it('requires authentication and returns only the safe projection', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/toeic/questions')
      .expect(401);

    const response = await request(app.getHttpServer())
      .get('/api/v1/toeic/questions?page=1&size=20')
      .set('Authorization', 'Bearer local.signed.token')
      .set('X-Correlation-Id', 'toeic-e2e-001')
      .expect(200);

    expect(response.body).toMatchObject({
      data: [question],
      page: { number: 1, size: 20, totalItems: 1, totalPages: 1 },
      meta: {
        correlationId: 'toeic-e2e-001',
        idempotencyStatus: 'not_applicable',
      },
    });
    expect(JSON.stringify(response.body)).not.toContain('correctAnswer');
    expect(JSON.stringify(response.body)).not.toContain('sourceIdentity');
    expect(JSON.stringify(response.body)).not.toContain('rightsOwner');
  });

  it('rejects unknown query fields and normalizes missing records', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/toeic/questions?unknown=true')
      .set('Authorization', 'Bearer local.signed.token')
      .expect(400);

    repository.find.mockResolvedValue(null);
    const response = await request(app.getHttpServer())
      .get('/api/v1/toeic/questions/missing')
      .set('Authorization', 'Bearer local.signed.token')
      .expect(404);
    const errorBody = response.body as {
      error: { code: string; message: string; details: unknown[] };
    };
    expect(errorBody.error).toEqual({
      code: 'RESOURCE_NOT_FOUND',
      message: 'TOEIC question was not found.',
      details: [],
    });
    expect(JSON.stringify(response.body)).not.toContain('correctAnswer');
  });

  it('sanitizes repository failures', async () => {
    repository.list.mockRejectedValue(new Error('private database detail'));
    const response = await request(app.getHttpServer())
      .get('/api/v1/toeic/questions')
      .set('Authorization', 'Bearer local.signed.token')
      .expect(500);
    const errorBody = response.body as {
      error: { message: string };
    };
    expect(errorBody.error.message).toBe(
      'TOEIC questions are temporarily unavailable.',
    );
    expect(JSON.stringify(response.body)).not.toContain(
      'private database detail',
    );
  });
});
