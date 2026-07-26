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
import { DAILY_SENTENCE_REPOSITORY } from '../src/modules/daily-sentence/daily-sentence.models';
import type { DailySentenceRepository } from '../src/modules/daily-sentence/daily-sentence.ports';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Daily Sentence API (e2e)', () => {
  let app: INestApplication<App>;
  const external = createExternalIdentity({
    provider: 'SUPABASE',
    subject: 'daily-sentence-user',
    issuer: 'issuer',
    audience: 'authenticated',
  });
  const principal = createApplicationPrincipal({
    applicationUserId: 'daily-sentence-user-001',
    externalIdentity: external,
    roles: ['FREE_USER'],
    ownerships: [],
    entitlements: [],
  });
  const repository: jest.Mocked<DailySentenceRepository> = {
    profileTimezone: jest.fn().mockResolvedValue('Asia/Ho_Chi_Minh'),
    eligibleSentences: jest.fn().mockResolvedValue([
      {
        id: 'ds-001',
        prompt: 'Translate this idea: practise every morning.',
        expectedAnswer: 'I practise every morning.',
      },
    ]),
    completion: jest.fn().mockResolvedValue(null),
    complete: jest.fn().mockResolvedValue({
      sentence: {
        id: 'ds-001',
        prompt: 'Translate this idea: practise every morning.',
        expectedAnswer: 'I practise every morning.',
      },
      submittedAnswer: 'I practise every morning',
      isCorrect: true,
      feedback: 'Correct',
      completedAt: new Date('2026-07-20T00:00:00Z'),
    }),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({ $queryRaw: jest.fn().mockResolvedValue([{ result: 1 }]) })
      .overrideProvider(EXTERNAL_IDENTITY_VERIFIER)
      .useValue({ verify: jest.fn().mockResolvedValue(external) })
      .overrideProvider(APPLICATION_PRINCIPAL_RESOLVER)
      .useValue({ resolve: jest.fn().mockResolvedValue(principal) })
      .overrideProvider(DAILY_SENTENCE_REPOSITORY)
      .useValue(repository)
      .compile();
    app = module.createNestApplication();
    await app.init();
  });

  it('protects the route and redacts the expected answer before submit', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/daily-sentences/today')
      .set('Authorization', 'Bearer local.token.value')
      .expect(200);

    const body = response.body as {
      data: { sentence: { prompt: string } };
    };
    expect(body.data.sentence.prompt).toContain('Translate this idea');
    expect(JSON.stringify(response.body)).not.toContain('expectedAnswer');
    expect(JSON.stringify(response.body)).not.toContain(
      'I practise every morning.',
    );
    expect(repository.profileTimezone.mock.calls).toContainEqual([
      'daily-sentence-user-001',
    ]);
  });

  it('submits once and replays persisted owner feedback', async () => {
    repository.completion
      .mockReset()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        sentence: {
          id: 'ds-001',
          prompt:
            'Translate this idea into English: practise for a few minutes.',
          expectedAnswer: 'I practise every morning.',
        },
        submittedAnswer: 'I practise every morning',
        isCorrect: true,
        feedback: 'Saved',
        completedAt: new Date('2026-07-20T00:00:00Z'),
      });

    repository.complete.mockResolvedValueOnce({
      sentence: {
        id: 'ds-001',
        prompt: 'Translate this idea into English: practise for a few minutes.',
        expectedAnswer: 'I practise every morning.',
      },
      submittedAnswer: 'I practise every morning',
      isCorrect: true,
      feedback: 'Saved',
      completedAt: new Date('2026-07-20T00:00:00Z'),
    });

    await request(app.getHttpServer())
      .post('/api/v1/daily-sentences/ds-001/submit')
      .set('Authorization', 'Bearer local.token.value')
      .send({ answer: 'I practise every morning' })
      .expect(201);

    const replay = await request(app.getHttpServer())
      .post('/api/v1/daily-sentences/ds-001/submit')
      .set('Authorization', 'Bearer local.token.value')
      .send({ answer: 'Different answer' })
      .expect(201);

    const replayBody = replay.body as {
      data: { feedback: { message: string } };
    };
    expect(replayBody.data.feedback.message).toBe('Saved');
    expect(repository.complete.mock.calls).toHaveLength(1);
    expect(repository.complete.mock.calls[0]?.[0]).toBe(
      'daily-sentence-user-001',
    );
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });
});
