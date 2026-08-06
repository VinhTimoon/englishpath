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
  TOEIC_LISTENING_PRACTICE_REPOSITORY,
  type ToeicListeningPracticeRepository,
  type ToeicPracticeSessionRecord,
} from '../src/modules/toeic/toeic-listening-practice.models';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  ToeicDifficulty,
  ToeicPart,
  ToeicQuestionType,
} from '../src/generated/prisma/enums';

const identity = createExternalIdentity({
  provider: 'SUPABASE',
  subject: 'listening-learner',
  issuer: 'issuer',
  audience: 'audience',
});
const principal = createApplicationPrincipal({
  applicationUserId: 'listening-learner-1',
  externalIdentity: identity,
  roles: ['FREE_USER'],
  ownerships: [],
  entitlements: [],
});
const question = {
  id: 'version-1',
  questionId: 'question-1',
  prompt: 'What is happening?',
  options: [
    { id: 'A', text: 'Standing' },
    { id: 'B', text: 'Sitting' },
  ],
  part: ToeicPart.PART_1,
  questionType: ToeicQuestionType.PHOTO_DESCRIPTION,
  difficulty: ToeicDifficulty.ELEMENTARY,
  mediaReference: null,
};

type ApiBody = {
  data: Record<string, unknown>;
  error: { code: string; message: string };
};

function makeSession(
  overrides: Partial<ToeicPracticeSessionRecord> = {},
): ToeicPracticeSessionRecord {
  return {
    id: 'session-1',
    userId: principal.applicationUserId,
    clientSessionId: 'client-1',
    listeningPart: ToeicPart.PART_1,
    questionIds: ['version-1'],
    status: 'ACTIVE',
    total: 1,
    score: null,
    startedAt: new Date('2026-08-06T00:00:00.000Z'),
    submittedAt: null,
    answers: [],
    ...overrides,
  };
}

describe('TOEIC listening practice API (e2e)', () => {
  let app: INestApplication<App>;
  const repository: jest.Mocked<ToeicListeningPracticeRepository> = {
    eligibleQuestions: jest.fn(),
    safeQuestionsByIds: jest.fn(),
    privateQuestionsByIds: jest.fn(),
    findSession: jest.fn(),
    findByClient: jest.fn(),
    createSession: jest.fn(),
    createAnswer: jest.fn(),
    submitSession: jest.fn(),
  };

  beforeEach(async () => {
    repository.findSession.mockReset();
    repository.privateQuestionsByIds.mockReset();
    repository.createAnswer.mockReset();
    repository.submitSession.mockReset();
    repository.findByClient.mockResolvedValue(null);
    repository.eligibleQuestions.mockResolvedValue([question]);
    repository.safeQuestionsByIds.mockResolvedValue([question]);
    repository.createSession.mockResolvedValue({
      id: 'session-1',
      userId: principal.applicationUserId,
      clientSessionId: 'client-1',
      listeningPart: ToeicPart.PART_1,
      questionIds: ['version-1'],
      status: 'ACTIVE',
      total: 1,
      score: null,
      startedAt: new Date('2026-08-06T00:00:00.000Z'),
      submittedAt: null,
      answers: [],
    });
    repository.privateQuestionsByIds.mockResolvedValue([
      { id: 'version-1', options: question.options, correctAnswer: 'A' },
    ]);
    repository.createAnswer.mockResolvedValue(true);
    repository.submitSession.mockResolvedValue(true);

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(TOEIC_LISTENING_PRACTICE_REPOSITORY)
      .useValue(repository)
      .overrideProvider(EXTERNAL_IDENTITY_VERIFIER)
      .useValue({ verify: jest.fn().mockResolvedValue(identity) })
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

  it('requires authentication and returns only the safe session projection', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/toeic/practice/listening/sessions')
      .send({ clientSessionId: 'client-1', questionCount: 1 })
      .expect(401);

    const response = await request(app.getHttpServer())
      .post('/api/v1/toeic/practice/listening/sessions')
      .set('Authorization', 'Bearer local.signed.token')
      .set('X-Correlation-Id', 'listening-e2e-001')
      .send({ clientSessionId: 'client-1', questionCount: 1 })
      .expect(200);

    const body = response.body as {
      data: { session: unknown; questions: unknown[]; replayed: boolean };
      meta: { correlationId: string; idempotencyStatus: string };
    };
    expect(body.data.session).toMatchObject({
      sessionId: 'session-1',
      status: 'ACTIVE',
      total: 1,
    });
    expect(body.data.replayed).toBe(false);
    expect(body.data.questions).toHaveLength(1);
    const firstQuestion = body.data.questions[0] as {
      id: string;
      options: readonly { id: string; text: string }[];
    };
    expect(firstQuestion.id).toBe('version-1');
    expect(firstQuestion.options).toEqual(question.options);
    expect(body.meta).toEqual({
      correlationId: 'listening-e2e-001',
      idempotencyStatus: 'created',
    });
    expect(JSON.stringify(body)).not.toContain('correctAnswer');
  });

  it('rejects unknown fields before starting a session', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/toeic/practice/listening/sessions')
      .set('Authorization', 'Bearer local.signed.token')
      .send({ clientSessionId: 'client-1', questionCount: 1, answerKey: 'A' })
      .expect(400);
    expect(repository.createSession.mock.calls).toHaveLength(0);
  });

  it('answers only selected questions, keeps correctness private, and replays identical answers', async () => {
    repository.findSession.mockResolvedValue(makeSession());
    const answer = await request(app.getHttpServer())
      .post('/api/v1/toeic/practice/listening/sessions/session-1/answers')
      .set('Authorization', 'Bearer local.signed.token')
      .send({ questionId: 'version-1', selectedOption: 'A' })
      .expect(200);
    const answerBody = answer.body as ApiBody;
    expect(answerBody.data).toMatchObject({
      accepted: true,
      replayed: false,
      questionId: 'version-1',
    });
    expect(JSON.stringify(answerBody)).not.toContain('correctAnswer');
    expect(JSON.stringify(answerBody)).not.toContain('isCorrect');

    repository.findSession.mockResolvedValue(
      makeSession({
        answers: [
          {
            id: 'answer-1',
            sessionId: 'session-1',
            questionId: 'version-1',
            selectedOption: 'A',
            isCorrect: true,
            answeredAt: new Date(),
          },
        ],
      }),
    );
    const replay = await request(app.getHttpServer())
      .post('/api/v1/toeic/practice/listening/sessions/session-1/answers')
      .set('Authorization', 'Bearer local.signed.token')
      .send({ questionId: 'version-1', selectedOption: 'A' })
      .expect(200);
    const replayBody = replay.body as ApiBody;
    expect(replayBody.data).toMatchObject({ accepted: true, replayed: true });

    const invalid = await request(app.getHttpServer())
      .post('/api/v1/toeic/practice/listening/sessions/session-1/answers')
      .set('Authorization', 'Bearer local.signed.token')
      .send({ questionId: 'version-1', selectedOption: 'C' })
      .expect(409);
    expect((invalid.body as ApiBody).error.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('rejects unknown or non-owned sessions and incomplete submit', async () => {
    repository.findSession.mockResolvedValue(null);
    await request(app.getHttpServer())
      .post('/api/v1/toeic/practice/listening/sessions/other-session/answers')
      .set('Authorization', 'Bearer local.signed.token')
      .send({ questionId: 'version-1', selectedOption: 'A' })
      .expect(404);

    repository.findSession.mockResolvedValue(makeSession());
    const submit = await request(app.getHttpServer())
      .post('/api/v1/toeic/practice/listening/sessions/session-1/submit')
      .set('Authorization', 'Bearer local.signed.token')
      .expect(422);
    expect((submit.body as ApiBody).error.code).toBe('INCOMPLETE_SESSION');
  });

  it('submits and reads a safe final result idempotently', async () => {
    const completed = makeSession({
      answers: [
        {
          id: 'answer-1',
          sessionId: 'session-1',
          questionId: 'version-1',
          selectedOption: 'A',
          isCorrect: true,
          answeredAt: new Date(),
        },
      ],
    });
    const submitted = makeSession({
      status: 'SUBMITTED',
      score: 1,
      submittedAt: new Date(),
      answers: completed.answers,
    });
    repository.findSession
      .mockResolvedValueOnce(completed)
      .mockResolvedValueOnce(submitted);
    const response = await request(app.getHttpServer())
      .post('/api/v1/toeic/practice/listening/sessions/session-1/submit')
      .set('Authorization', 'Bearer local.signed.token')
      .expect(200);
    const submitBody = response.body as ApiBody;
    expect(submitBody.data).toMatchObject({
      status: 'SUBMITTED',
      score: 1,
      total: 1,
    });
    expect(JSON.stringify(submitBody)).not.toContain('correctAnswer');

    repository.findSession.mockResolvedValue(submitted);
    const result = await request(app.getHttpServer())
      .get('/api/v1/toeic/practice/listening/sessions/session-1/result')
      .set('Authorization', 'Bearer local.signed.token')
      .expect(200);
    const resultBody = result.body as ApiBody;
    expect(resultBody.data).toMatchObject({ status: 'SUBMITTED', score: 1 });
    expect(JSON.stringify(resultBody)).not.toContain('isCorrect');
  });

  it('sanitizes practice repository failures', async () => {
    repository.findByClient.mockRejectedValue(
      new Error('private database detail'),
    );
    const response = await request(app.getHttpServer())
      .post('/api/v1/toeic/practice/listening/sessions')
      .set('Authorization', 'Bearer local.signed.token')
      .send({ clientSessionId: 'client-1', questionCount: 1 })
      .expect(500);
    expect((response.body as ApiBody).error.message).toBe(
      'TOEIC questions are temporarily unavailable.',
    );
    expect(JSON.stringify(response.body)).not.toContain(
      'private database detail',
    );
  });
});
