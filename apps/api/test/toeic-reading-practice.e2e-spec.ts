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
  TOEIC_READING_PRACTICE_REPOSITORY,
  type ReadingGradingSession,
  type ReadingSession,
  type ToeicReadingPracticeRepository,
} from '../src/modules/toeic/toeic-reading-practice.models';
import {
  TOEIC_PRACTICE_CATALOGUE_REPOSITORY,
  type ToeicPracticeCatalogueRepository,
} from '../src/modules/toeic/toeic-practice-catalogue.models';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  ToeicDifficulty,
  ToeicPart,
  ToeicQuestionType,
} from '../src/generated/prisma/enums';

const identity = createExternalIdentity({
  provider: 'SUPABASE',
  subject: 'reading-e2e-subject',
  issuer: 'issuer',
  audience: 'audience',
});
const principal = createApplicationPrincipal({
  applicationUserId: 'reading-e2e-learner',
  externalIdentity: identity,
  roles: ['FREE_USER'],
  ownerships: [],
  entitlements: [],
});
const otherPrincipal = createApplicationPrincipal({
  applicationUserId: 'reading-e2e-other-learner',
  externalIdentity: createExternalIdentity({
    provider: 'SUPABASE',
    subject: 'reading-e2e-other-subject',
    issuer: 'issuer',
    audience: 'audience',
  }),
  roles: ['FREE_USER'],
  ownerships: [],
  entitlements: [],
});
const question = {
  id: 'reading-version-1',
  questionId: 'reading-question-1',
  prompt: 'The meeting begins at ___.',
  options: [
    { id: 'A', text: 'nine' },
    { id: 'B', text: 'ten' },
  ],
  part: ToeicPart.PART_5,
  questionType: ToeicQuestionType.INCOMPLETE_SENTENCE,
  difficulty: ToeicDifficulty.ELEMENTARY,
  topic: 'scheduling',
  stimulusGroup: null,
  mediaReference: null,
  explanation: 'safe explanation',
};

type ApiBody = {
  data: Record<string, unknown>;
  error: { code: string; message: string };
};

function makeSession(overrides: Partial<ReadingSession> = {}): ReadingSession {
  return {
    id: 'reading-session-1',
    userId: principal.applicationUserId,
    clientSessionId: 'reading-client-1',
    readingPart: ToeicPart.PART_5,
    questionIds: [question.id],
    status: 'ACTIVE',
    total: 1,
    score: null,
    startedAt: new Date('2026-08-06T00:00:00.000Z'),
    submittedAt: null,
    answers: [],
    ...overrides,
  };
}

function makeGradingSession(
  overrides: Partial<ReadingGradingSession> = {},
): ReadingGradingSession {
  return {
    ...makeSession(),
    ...overrides,
    answers: overrides.answers ?? [],
  };
}

describe('TOEIC reading practice API (e2e)', () => {
  let app: INestApplication<App>;
  let resolvedPrincipal = principal;
  const repository: jest.Mocked<ToeicReadingPracticeRepository> = {
    eligibleQuestions: jest.fn(),
    safeQuestionsByIds: jest.fn(),
    snapshotQuestionsByIds: jest.fn(),
    privateQuestionsByIds: jest.fn(),
    findSession: jest.fn(),
    findGradingSession: jest.fn(),
    findByClient: jest.fn(),
    createSession: jest.fn(),
    createAnswer: jest.fn(),
    submitSession: jest.fn(),
  };
  const catalogueRepository: jest.Mocked<ToeicPracticeCatalogueRepository> = {
    catalogue: jest.fn(),
  };

  beforeEach(async () => {
    resolvedPrincipal = principal;
    repository.findSession.mockReset();
    repository.findGradingSession.mockReset();
    repository.privateQuestionsByIds.mockReset();
    repository.createAnswer.mockReset();
    repository.submitSession.mockReset();
    repository.findByClient.mockResolvedValue(null);
    repository.findGradingSession.mockResolvedValue(makeGradingSession());
    repository.eligibleQuestions.mockResolvedValue([question]);
    repository.safeQuestionsByIds.mockResolvedValue([question]);
    repository.snapshotQuestionsByIds.mockResolvedValue([question]);
    repository.createSession.mockResolvedValue(makeSession());
    repository.privateQuestionsByIds.mockResolvedValue([
      { id: question.id, options: question.options, correctAnswer: 'A' },
    ]);
    repository.createAnswer.mockResolvedValue(true);
    repository.submitSession.mockResolvedValue(true);
    catalogueRepository.catalogue.mockResolvedValue({
      listening: {
        parts: [ToeicPart.PART_1],
        difficulties: [ToeicDifficulty.BEGINNER],
      },
      reading: {
        parts: [ToeicPart.PART_5],
        difficulties: [ToeicDifficulty.ELEMENTARY],
        topics: ['scheduling'],
      },
    });

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(TOEIC_READING_PRACTICE_REPOSITORY)
      .useValue(repository)
      .overrideProvider(TOEIC_PRACTICE_CATALOGUE_REPOSITORY)
      .useValue(catalogueRepository)
      .overrideProvider(EXTERNAL_IDENTITY_VERIFIER)
      .useValue({ verify: jest.fn().mockResolvedValue(identity) })
      .overrideProvider(APPLICATION_PRINCIPAL_RESOLVER)
      .useValue({
        resolve: jest
          .fn()
          .mockImplementation(() => Promise.resolve(resolvedPrincipal)),
      })
      .compile();
    app = moduleFixture.createNestApplication();
    configureOpenApi(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it('returns only the server-owned practice catalogue', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/toeic/practice/catalogue')
      .set('Authorization', 'Bearer local.signed.token')
      .expect(200);

    const responseBody = response.body as { data: unknown };
    expect(responseBody.data).toEqual({
      listening: { parts: ['PART_1'], difficulties: ['BEGINNER'] },
      reading: {
        parts: ['PART_5'],
        difficulties: ['ELEMENTARY'],
        topics: ['scheduling'],
      },
    });
    expect(JSON.stringify(response.body)).not.toMatch(
      /correctAnswer|isCorrect|sourceUrl|rightsOwner|reviewEvidence/,
    );
  });

  it('requires authentication and returns a safe Parts 5-7 session', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/toeic/practice/reading/sessions')
      .send({
        clientSessionId: 'reading-client-1',
        readingPart: 'PART_5',
        questionCount: 1,
      })
      .expect(401);

    const response = await request(app.getHttpServer())
      .post('/api/v1/toeic/practice/reading/sessions')
      .set('Authorization', 'Bearer local.signed.token')
      .set('X-Correlation-Id', 'reading-e2e-001')
      .send({
        clientSessionId: 'reading-client-1',
        readingPart: 'PART_5',
        questionCount: 1,
      })
      .expect(200);
    const body = response.body as ApiBody;
    expect(body.data).toMatchObject({ replayed: false });
    expect(body.data.questions).toBeDefined();
    const serialized = JSON.stringify(body);
    for (const forbidden of [
      'correctAnswer',
      'isCorrect',
      'licenseStatus',
      'reviewStatus',
      'publicationState',
      'rightsOwner',
      'sourceUrl',
      'provenance',
      'answers',
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it('rejects unknown fields and invalid reading parts', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/toeic/practice/reading/sessions')
      .set('Authorization', 'Bearer local.signed.token')
      .send({ clientSessionId: 'reading-client-1', answerKey: 'A' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/toeic/practice/reading/sessions')
      .set('Authorization', 'Bearer local.signed.token')
      .send({ clientSessionId: 'reading-client-1', readingPart: 'PART_1' })
      .expect(400);
    expect(repository.createSession.mock.calls).toHaveLength(0);
  });

  it.each([ToeicPart.PART_6, ToeicPart.PART_7])(
    'starts a governed %s reading session without changing the requested taxonomy',
    async (part) => {
      const candidate = {
        ...question,
        id: `reading-${part.toLowerCase()}`,
        questionId: `question-${part.toLowerCase()}`,
        part,
      };
      repository.eligibleQuestions.mockResolvedValue([candidate]);
      repository.createSession.mockResolvedValue(
        makeSession({
          id: `session-${part.toLowerCase()}`,
          clientSessionId: `client-${part.toLowerCase()}`,
          readingPart: part,
          questionIds: [candidate.id],
        }),
      );

      const response = await request(app.getHttpServer())
        .post('/api/v1/toeic/practice/reading/sessions')
        .set('Authorization', 'Bearer local.signed.token')
        .send({
          clientSessionId: `client-${part.toLowerCase()}`,
          readingPart: part,
          questionCount: 1,
        })
        .expect(200);

      expect(repository.eligibleQuestions.mock.calls).toContainEqual([
        expect.any(Date),
        part,
      ]);
      const responseData = (response.body as ApiBody).data as {
        questions: unknown[];
      };
      expect(responseData.questions[0]).toMatchObject({
        part,
        id: candidate.id,
      });
    },
  );

  it('answers safely, rejects ownership failures, and enforces incomplete submit', async () => {
    repository.findSession.mockResolvedValue(makeSession());
    repository.findGradingSession.mockResolvedValue(makeGradingSession());
    repository.findGradingSession.mockResolvedValue(makeGradingSession());
    const answer = await request(app.getHttpServer())
      .post('/api/v1/toeic/practice/reading/sessions/reading-session-1/answers')
      .set('Authorization', 'Bearer local.signed.token')
      .send({ questionId: question.id, selectedOption: 'A' })
      .expect(200);
    const answerBody = answer.body as ApiBody;
    expect(answerBody.data).toMatchObject({ accepted: true, replayed: false });
    expect(JSON.stringify(answerBody)).not.toContain('isCorrect');

    repository.findSession.mockResolvedValue(makeSession());
    await request(app.getHttpServer())
      .post('/api/v1/toeic/practice/reading/sessions/reading-session-1/answers')
      .set('Authorization', 'Bearer local.signed.token')
      .send({ questionId: 'not-selected', selectedOption: 'A' })
      .expect(404);
    await request(app.getHttpServer())
      .post('/api/v1/toeic/practice/reading/sessions/reading-session-1/answers')
      .set('Authorization', 'Bearer local.signed.token')
      .send({ questionId: question.id, selectedOption: 'C' })
      .expect(422);

    repository.findSession.mockResolvedValue(
      makeSession({
        answers: [
          {
            id: 'reading-answer-1',
            sessionId: 'reading-session-1',
            questionId: question.id,
            selectedOption: 'A',
            answeredAt: new Date(),
          },
        ],
      }),
    );
    const replay = await request(app.getHttpServer())
      .post('/api/v1/toeic/practice/reading/sessions/reading-session-1/answers')
      .set('Authorization', 'Bearer local.signed.token')
      .send({ questionId: question.id, selectedOption: 'A' })
      .expect(200);
    expect((replay.body as ApiBody).data).toMatchObject({ replayed: true });
    await request(app.getHttpServer())
      .post('/api/v1/toeic/practice/reading/sessions/reading-session-1/answers')
      .set('Authorization', 'Bearer local.signed.token')
      .send({ questionId: question.id, selectedOption: 'B' })
      .expect(409);

    repository.findSession.mockResolvedValue(null);
    repository.findGradingSession.mockResolvedValue(null);
    await request(app.getHttpServer())
      .get('/api/v1/toeic/practice/reading/sessions/other/result')
      .set('Authorization', 'Bearer local.signed.token')
      .expect(404);

    repository.findSession.mockResolvedValue(makeSession());
    repository.findGradingSession.mockResolvedValue(makeGradingSession());
    const submit = await request(app.getHttpServer())
      .post('/api/v1/toeic/practice/reading/sessions/reading-session-1/submit')
      .set('Authorization', 'Bearer local.signed.token')
      .expect(422);
    expect((submit.body as ApiBody).error.code).toBe('INCOMPLETE_SESSION');

    repository.findSession.mockResolvedValue(null);
    repository.findGradingSession.mockResolvedValue(null);
    await request(app.getHttpServer())
      .post('/api/v1/toeic/practice/reading/sessions/other/submit')
      .set('Authorization', 'Bearer local.signed.token')
      .expect(404);
  });

  it('replays exact starts, rejects changed starts, and recovers a unique-key race', async () => {
    repository.findByClient.mockResolvedValue(makeSession());
    const replay = await request(app.getHttpServer())
      .post('/api/v1/toeic/practice/reading/sessions')
      .set('Authorization', 'Bearer local.signed.token')
      .send({
        clientSessionId: 'reading-client-1',
        readingPart: 'PART_5',
        questionCount: 1,
      })
      .expect(200);
    expect((replay.body as ApiBody).data).toMatchObject({ replayed: true });

    await request(app.getHttpServer())
      .post('/api/v1/toeic/practice/reading/sessions')
      .set('Authorization', 'Bearer local.signed.token')
      .send({
        clientSessionId: 'reading-client-1',
        readingPart: 'PART_6',
        questionCount: 1,
      })
      .expect(409);

    repository.findByClient
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(makeSession());
    repository.createSession.mockRejectedValueOnce({ code: 'P2002' });
    const raced = await request(app.getHttpServer())
      .post('/api/v1/toeic/practice/reading/sessions')
      .set('Authorization', 'Bearer local.signed.token')
      .send({
        clientSessionId: 'reading-client-1',
        readingPart: 'PART_5',
        questionCount: 1,
      })
      .expect(200);
    expect((raced.body as ApiBody).data).toMatchObject({ replayed: true });
  });

  it('submits and reads a safe final result', async () => {
    const completed = makeGradingSession({
      answers: [
        {
          id: 'reading-answer-1',
          sessionId: 'reading-session-1',
          questionId: question.id,
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
    repository.findGradingSession.mockResolvedValueOnce(completed);
    repository.findSession.mockResolvedValueOnce(submitted);
    const response = await request(app.getHttpServer())
      .post('/api/v1/toeic/practice/reading/sessions/reading-session-1/submit')
      .set('Authorization', 'Bearer local.signed.token')
      .expect(200);
    const body = response.body as ApiBody;
    expect(body.data).toMatchObject({ status: 'SUBMITTED', score: 1 });
    expect(JSON.stringify(body)).not.toContain('correctAnswer');
    expect(JSON.stringify(body)).not.toContain('publicationState');
    expect(JSON.stringify(body)).not.toContain('licenseStatus');

    repository.findSession.mockResolvedValue(submitted);
    const result = await request(app.getHttpServer())
      .get('/api/v1/toeic/practice/reading/sessions/reading-session-1/result')
      .set('Authorization', 'Bearer local.signed.token')
      .expect(200);
    expect((result.body as ApiBody).data).toMatchObject({
      status: 'SUBMITTED',
      score: 1,
    });
    expect(JSON.stringify(result.body)).not.toContain('isCorrect');

    repository.findGradingSession.mockResolvedValue(
      makeGradingSession({
        status: 'SUBMITTED',
        score: 1,
        submittedAt: submitted.submittedAt,
        answers: completed.answers,
      }),
    );
    const submitCallsBeforeReplay = repository.submitSession.mock.calls.length;
    await request(app.getHttpServer())
      .post('/api/v1/toeic/practice/reading/sessions/reading-session-1/submit')
      .set('Authorization', 'Bearer local.signed.token')
      .expect(200);
    expect(repository.submitSession.mock.calls).toHaveLength(
      submitCallsBeforeReplay,
    );

    await request(app.getHttpServer())
      .post('/api/v1/toeic/practice/reading/sessions/reading-session-1/answers')
      .set('Authorization', 'Bearer local.signed.token')
      .send({ questionId: question.id, selectedOption: 'A' })
      .expect(404);
  });

  it('uses only the authenticated principal owner and maps concurrent lifecycle races safely', async () => {
    repository.findByClient.mockImplementation((userId) => {
      expect(userId).toBe(principal.applicationUserId);
      return Promise.resolve(null);
    });
    repository.createSession.mockImplementation((input) => {
      expect(input.userId).toBe(principal.applicationUserId);
      return Promise.resolve(makeSession({ userId: input.userId }));
    });
    await request(app.getHttpServer())
      .post('/api/v1/toeic/practice/reading/sessions')
      .set('Authorization', 'Bearer local.signed.token')
      .send({ clientSessionId: 'principal-bound-client', questionCount: 1 })
      .expect(200);

    repository.findSession.mockResolvedValue(makeSession());
    repository.createAnswer.mockResolvedValue(false);
    await request(app.getHttpServer())
      .post('/api/v1/toeic/practice/reading/sessions/reading-session-1/answers')
      .set('Authorization', 'Bearer local.signed.token')
      .send({ questionId: question.id, selectedOption: 'A' })
      .expect(409);

    const completed = makeGradingSession({
      answers: [
        {
          id: 'reading-answer-1',
          sessionId: 'reading-session-1',
          questionId: question.id,
          selectedOption: 'A',
          isCorrect: true,
          answeredAt: new Date(),
        },
      ],
    });
    repository.findSession.mockResolvedValue(completed);
    repository.findGradingSession.mockResolvedValue(completed);
    repository.submitSession.mockResolvedValue(false);
    await request(app.getHttpServer())
      .post('/api/v1/toeic/practice/reading/sessions/reading-session-1/submit')
      .set('Authorization', 'Bearer local.signed.token')
      .expect(409);
  });

  it('returns the same sanitized not-found response for unknown and cross-owner sessions', async () => {
    repository.findSession.mockImplementation((sessionId, userId) =>
      Promise.resolve(
        sessionId === 'owned-by-principal' &&
          userId === principal.applicationUserId
          ? makeSession({ id: sessionId })
          : null,
      ),
    );
    resolvedPrincipal = otherPrincipal;
    const crossOwner = await request(app.getHttpServer())
      .get('/api/v1/toeic/practice/reading/sessions/owned-by-principal/result')
      .set('Authorization', 'Bearer local.signed.token')
      .set('X-Correlation-Id', 'owner-isolation-cross')
      .expect(404);
    resolvedPrincipal = principal;
    const unknown = await request(app.getHttpServer())
      .get('/api/v1/toeic/practice/reading/sessions/unknown-session/result')
      .set('Authorization', 'Bearer local.signed.token')
      .set('X-Correlation-Id', 'owner-isolation-unknown')
      .expect(404);
    expect((crossOwner.body as ApiBody).error).toEqual(
      (unknown.body as ApiBody).error,
    );
    expect(repository.findSession.mock.calls).toContainEqual([
      'owned-by-principal',
      otherPrincipal.applicationUserId,
    ]);
  });

  it('sanitizes repository failures', async () => {
    repository.findByClient.mockRejectedValue(
      new Error('private database detail'),
    );
    const response = await request(app.getHttpServer())
      .post('/api/v1/toeic/practice/reading/sessions')
      .set('Authorization', 'Bearer local.signed.token')
      .send({ clientSessionId: 'reading-client-1', questionCount: 1 })
      .expect(500);
    expect((response.body as ApiBody).error.message).toBe(
      'TOEIC questions are temporarily unavailable.',
    );
    expect(JSON.stringify(response.body)).not.toContain(
      'private database detail',
    );
  });
});
