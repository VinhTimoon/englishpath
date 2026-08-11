import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureOpenApi } from '../src/config/openapi';
import {
  APPLICATION_PRINCIPAL_RESOLVER,
  EXTERNAL_IDENTITY_VERIFIER,
} from '../src/modules/auth/auth.tokens';
import {
  createApplicationPrincipal,
  createExternalIdentity,
} from '../src/modules/access';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  ToeicDifficulty,
  ToeicPart,
  ToeicQuestionType,
} from '../src/generated/prisma/enums';
import {
  TOEIC_TIMED_TEST_CLOCK,
  TOEIC_TIMED_TEST_REPOSITORY,
  type TimedPrivateQuestion,
  type TimedSession,
  type ToeicTimedTestRepository,
} from '../src/modules/toeic/toeic-timed-test.models';
import {
  PRACTICE_REPOSITORY,
  TOEIC_ERROR_NOTEBOOK_CAPTURE,
} from '../src/modules/practice/practice.models';

const identity = createExternalIdentity({
  provider: 'SUPABASE',
  subject: 'timed-e2e-subject',
  issuer: 'issuer',
  audience: 'audience',
});
const principal = createApplicationPrincipal({
  applicationUserId: 'timed-e2e-learner',
  externalIdentity: identity,
  roles: ['FREE_USER'],
  ownerships: [],
  entitlements: [],
});
const alternatePrincipal = createApplicationPrincipal({
  applicationUserId: 'another-learner',
  externalIdentity: { ...identity, subject: 'another-subject' },
  roles: ['FREE_USER'],
  ownerships: [],
  entitlements: [],
});

function question(part: ToeicPart, index: number): TimedPrivateQuestion {
  return {
    id: `timed-version-${index}`,
    questionId: `timed-question-${index}`,
    prompt: `Prompt ${index}`,
    options: [
      { id: 'A', text: 'Answer' },
      { id: 'B', text: 'Other' },
    ],
    part,
    questionType: ToeicQuestionType.PHOTO_DESCRIPTION,
    difficulty: ToeicDifficulty.ELEMENTARY,
    topic: null,
    stimulusGroup: null,
    mediaReference: null,
    explanation: null,
    correctAnswer: 'A',
  };
}

function catalogue() {
  const counts: Record<ToeicPart, number> = {
    PART_1: 1,
    PART_2: 2,
    PART_3: 4,
    PART_4: 3,
    PART_5: 3,
    PART_6: 2,
    PART_7: 5,
  };
  let index = 1;
  return Object.entries(counts).flatMap(([part, count]) =>
    Array.from({ length: count }, () => question(part as ToeicPart, index++)),
  );
}

function halfCatalogue() {
  const counts: Record<ToeicPart, number> = {
    PART_1: 2,
    PART_2: 6,
    PART_3: 10,
    PART_4: 7,
    PART_5: 8,
    PART_6: 4,
    PART_7: 13,
  };
  let index = 100;
  return Object.entries(counts).flatMap(([part, count]) =>
    Array.from({ length: count }, () => question(part as ToeicPart, index++)),
  );
}

function makeSession(overrides: Partial<TimedSession> = {}): TimedSession {
  const now = new Date('2026-08-06T00:00:00.000Z');
  return {
    id: 'timed-session-1',
    userId: principal.applicationUserId,
    clientSessionId: 'timed-client-1',
    mode: 'MINI',
    policyVersion: 'v1',
    questionIds: catalogue().map((item) => item.id),
    startedAt: now,
    deadlineAt: new Date(now.getTime() + 20 * 60 * 1000),
    status: 'ACTIVE',
    total: 20,
    score: null,
    finalizedAt: null,
    answers: [],
    ...overrides,
  };
}

type ApiBody = { data: Record<string, unknown> };

describe('TOEIC timed-test API', () => {
  let app: INestApplication<App>;
  let currentSession: TimedSession;
  const questions = catalogue();
  const repository: jest.Mocked<ToeicTimedTestRepository> = {
    eligibleQuestions: jest.fn(),
    safeQuestionsByIds: jest.fn(),
    privateQuestionsByIds: jest.fn(),
    finalizedQuestionsByIds: jest.fn(),
    findByClient: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    createAnswer: jest.fn(),
    finalize: jest.fn(),
  };
  const captureErrors = jest.fn();
  const practiceRepository = {
    errors: jest.fn(),
  };
  const resolvePrincipal = jest.fn();

  beforeEach(async () => {
    currentSession = makeSession();
    repository.eligibleQuestions.mockResolvedValue(questions);
    repository.safeQuestionsByIds.mockImplementation((ids) =>
      Promise.resolve(questions.filter((item) => ids.includes(item.id))),
    );
    repository.privateQuestionsByIds.mockImplementation((ids) =>
      Promise.resolve(questions.filter((item) => ids.includes(item.id))),
    );
    repository.finalizedQuestionsByIds.mockImplementation((ids) =>
      Promise.resolve(questions.filter((item) => ids.includes(item.id))),
    );
    repository.findByClient.mockResolvedValue(null);
    repository.find.mockImplementation(() => Promise.resolve(currentSession));
    repository.create.mockImplementation((input) =>
      Promise.resolve(
        makeSession({
          clientSessionId: input.clientSessionId,
          mode: input.mode,
          policyVersion: input.policyVersion,
          questionIds: [...input.questionIds],
          startedAt: input.startedAt,
          deadlineAt: input.deadlineAt,
          total: input.total,
        }),
      ),
    );
    repository.createAnswer.mockImplementation((input) => {
      if (
        currentSession.answers.some(
          (answer) => answer.questionId === input.questionId,
        )
      ) {
        return Promise.resolve('replayed');
      }
      currentSession = {
        ...currentSession,
        answers: [
          ...currentSession.answers,
          {
            questionId: input.questionId,
            selectedOption: input.selectedOption,
            isCorrect: input.isCorrect,
            answeredAt: input.answeredAt,
          },
        ],
      };
      return Promise.resolve('created');
    });
    repository.finalize.mockResolvedValue({
      state: 'incomplete',
      session: makeSession(),
    });
    captureErrors.mockResolvedValue(1);
    resolvePrincipal.mockResolvedValue(principal);
    practiceRepository.errors.mockResolvedValue({
      entries: [
        {
          questionId: 'timed-question-2',
          prompt: 'Prompt 2',
          selectedOption: 'B',
          correctOption: 'A',
          explanation: 'Review this rule.',
          source: 'TOEIC_TIMED_TEST',
          remediation: { href: '/error-notebook', label: 'Ôn lỗi TOEIC' },
        },
      ],
      pagination: { page: 2, size: 1, total: 2, hasNext: false },
    });

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(TOEIC_TIMED_TEST_REPOSITORY)
      .useValue(repository)
      .overrideProvider(PRACTICE_REPOSITORY)
      .useValue(practiceRepository)
      .overrideProvider(TOEIC_ERROR_NOTEBOOK_CAPTURE)
      .useValue(captureErrors)
      .overrideProvider(TOEIC_TIMED_TEST_CLOCK)
      .useValue(() => new Date('2026-08-06T00:00:00.000Z'))
      .overrideProvider(EXTERNAL_IDENTITY_VERIFIER)
      .useValue({ verify: jest.fn().mockResolvedValue(identity) })
      .overrideProvider(APPLICATION_PRINCIPAL_RESOLVER)
      .useValue({ resolve: resolvePrincipal })
      .compile();
    app = moduleFixture.createNestApplication();
    configureOpenApi(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it('protects the start route and returns a server-shaped safe mini test', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/toeic/tests/sessions')
      .send({ clientSessionId: 'timed-client-1', mode: 'MINI' })
      .expect(401);

    const response = await request(app.getHttpServer())
      .post('/api/v1/toeic/tests/sessions')
      .set('Authorization', 'Bearer local.signed.token')
      .set('X-Correlation-Id', 'timed-e2e-001')
      .send({ clientSessionId: 'timed-client-1', mode: 'MINI' })
      .expect(200);

    const body = response.body as ApiBody;
    expect(body.data).toMatchObject({ replayed: false });
    expect((body.data.questions as unknown[]).length).toBe(20);
    expect(
      (body.data.session as Record<string, unknown>).remainingSeconds,
    ).toBe(1200);
    expect(JSON.stringify(body)).not.toMatch(
      /correctAnswer|isCorrect|sourceUrl|rightsOwner|reviewStatus|publicationState|answers/,
    );
  });

  it('rejects unknown fields and invalid modes before starting a session', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/toeic/tests/sessions')
      .set('Authorization', 'Bearer local.signed.token')
      .send({
        clientSessionId: 'timed-client-1',
        mode: 'MINI',
        durationSeconds: 1,
      })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/toeic/tests/sessions')
      .set('Authorization', 'Bearer local.signed.token')
      .send({ clientSessionId: 'timed-client-1', mode: 'INVALID' })
      .expect(400);
    expect(repository.create.mock.calls).toHaveLength(0);
  });

  it('assembles the server-owned HALF shape through the API', async () => {
    const half = halfCatalogue();
    repository.eligibleQuestions.mockResolvedValue(half);
    const response = await request(app.getHttpServer())
      .post('/api/v1/toeic/tests/sessions')
      .set('Authorization', 'Bearer local.signed.token')
      .send({ clientSessionId: 'timed-half-client-1', mode: 'HALF' })
      .expect(200);
    const body = response.body as ApiBody;
    expect(body.data.session).toMatchObject({ mode: 'HALF', total: 50 });
    expect((body.data.questions as unknown[]).length).toBe(50);
    expect(JSON.stringify(body)).not.toMatch(
      /correctAnswer|isCorrect|sourceUrl|rightsOwner|reviewStatus|publicationState|answers/,
    );
  });

  it('fails closed for an empty catalogue and sanitizes repository failures', async () => {
    repository.eligibleQuestions.mockResolvedValue([]);
    await request(app.getHttpServer())
      .post('/api/v1/toeic/tests/sessions')
      .set('Authorization', 'Bearer local.signed.token')
      .send({ clientSessionId: 'timed-empty-client', mode: 'MINI' })
      .expect(404);

    repository.findByClient.mockResolvedValue(null);
    repository.eligibleQuestions.mockRejectedValue(
      new Error('database password should never cross the boundary'),
    );
    const failure = await request(app.getHttpServer())
      .post('/api/v1/toeic/tests/sessions')
      .set('Authorization', 'Bearer local.signed.token')
      .send({ clientSessionId: 'timed-failure-client', mode: 'MINI' })
      .expect(500);
    expect(JSON.stringify(failure.body)).not.toContain('database password');
  });

  it('answers without correctness and exposes final score only after finalization', async () => {
    const answer = await request(app.getHttpServer())
      .post('/api/v1/toeic/tests/sessions/timed-session-1/answers')
      .set('Authorization', 'Bearer local.signed.token')
      .send({ questionId: questions[0].id, selectedOption: 'A' })
      .expect(200);
    expect(JSON.stringify(answer.body)).not.toMatch(
      /correctAnswer|isCorrect|score/,
    );

    repository.finalize.mockResolvedValue({
      state: 'finalized',
      session: makeSession({
        status: 'SUBMITTED',
        score: 18,
        finalizedAt: new Date(),
      }),
    });
    const submitted = await request(app.getHttpServer())
      .post('/api/v1/toeic/tests/sessions/timed-session-1/submit')
      .set('Authorization', 'Bearer local.signed.token')
      .expect(200);
    expect((submitted.body as ApiBody).data).toMatchObject({
      session: { score: 18 },
    });
    expect(JSON.stringify(submitted.body)).not.toMatch(
      /correctAnswer|isCorrect/,
    );
  });

  it('returns active progress and keeps duplicate answers idempotent', async () => {
    const active = await request(app.getHttpServer())
      .get('/api/v1/toeic/tests/sessions/timed-session-1')
      .set('Authorization', 'Bearer local.signed.token')
      .expect(200);
    expect((active.body as ApiBody).data.session).toMatchObject({
      status: 'ACTIVE',
      answered: 0,
      total: 20,
    });
    expect(JSON.stringify(active.body)).not.toMatch(
      /correctAnswer|isCorrect|score|sourceUrl|rightsOwner|reviewStatus|publicationState/,
    );

    const payload = { questionId: questions[0].id, selectedOption: 'A' };
    await request(app.getHttpServer())
      .post('/api/v1/toeic/tests/sessions/timed-session-1/answers')
      .set('Authorization', 'Bearer local.signed.token')
      .send(payload)
      .expect(200);
    const replay = await request(app.getHttpServer())
      .post('/api/v1/toeic/tests/sessions/timed-session-1/answers')
      .set('Authorization', 'Bearer local.signed.token')
      .send(payload)
      .expect(200);
    expect((replay.body as ApiBody).data).toMatchObject({
      replayed: true,
      answered: 1,
      total: 20,
    });
    await request(app.getHttpServer())
      .post('/api/v1/toeic/tests/sessions/timed-session-1/answers')
      .set('Authorization', 'Bearer local.signed.token')
      .send({ questionId: questions[0].id, selectedOption: 'B' })
      .expect(409);
  });

  it('finalizes an expired active read and remains safe', async () => {
    const expired = makeSession({
      deadlineAt: new Date('2026-08-05T23:00:00.000Z'),
    });
    repository.find.mockResolvedValue(expired);
    repository.finalize.mockResolvedValue({
      state: 'finalized',
      session: makeSession({
        status: 'EXPIRED',
        score: 4,
        finalizedAt: new Date('2026-08-06T00:00:00.000Z'),
      }),
    });
    const response = await request(app.getHttpServer())
      .get('/api/v1/toeic/tests/sessions/timed-session-1/result')
      .set('Authorization', 'Bearer local.signed.token')
      .expect(200);
    expect((response.body as ApiBody).data.session).toMatchObject({
      status: 'EXPIRED',
      score: 4,
    });
    expect(JSON.stringify(response.body)).not.toMatch(
      /correctAnswer|isCorrect|selectedOption|sourceUrl|rightsOwner|reviewStatus|publicationState/,
    );
    expect(repository.finalize.mock.calls).toContainEqual([
      'timed-session-1',
      principal.applicationUserId,
      expect.any(Date),
    ]);
  });

  it('returns a persisted result on duplicate submit without a second score', async () => {
    repository.finalize.mockResolvedValue({
      state: 'already-finalized',
      session: makeSession({
        status: 'SUBMITTED',
        score: 17,
        finalizedAt: new Date('2026-08-06T00:10:00.000Z'),
      }),
    });
    const response = await request(app.getHttpServer())
      .post('/api/v1/toeic/tests/sessions/timed-session-1/submit')
      .set('Authorization', 'Bearer local.signed.token')
      .expect(200);
    expect((response.body as ApiBody).data.session).toMatchObject({
      status: 'SUBMITTED',
      score: 17,
    });
    expect(JSON.stringify(response.body)).not.toMatch(
      /correctAnswer|isCorrect|selectedOption|sourceUrl|rightsOwner|reviewStatus|publicationState/,
    );
  });

  it('returns deterministic aggregate analysis only for finalized sessions', async () => {
    const final = makeSession({
      status: 'SUBMITTED',
      score: 2,
      finalizedAt: new Date('2026-08-06T00:02:05.000Z'),
      answers: [
        {
          questionId: questions[0].id,
          selectedOption: 'A',
          isCorrect: true,
          answeredAt: new Date('2026-08-06T00:00:00.000Z'),
        },
        {
          questionId: questions[1].id,
          selectedOption: 'B',
          isCorrect: false,
          answeredAt: new Date('2026-08-06T00:01:00.000Z'),
        },
        {
          questionId: questions[10].id,
          selectedOption: 'A',
          isCorrect: true,
          answeredAt: new Date('2026-08-06T00:01:40.000Z'),
        },
      ],
    });
    repository.find.mockResolvedValue(final);

    const first = await request(app.getHttpServer())
      .get('/api/v1/toeic/tests/sessions/timed-session-1/analysis')
      .set('Authorization', 'Bearer local.signed.token')
      .expect(200);
    const second = await request(app.getHttpServer())
      .get('/api/v1/toeic/tests/sessions/timed-session-1/analysis')
      .set('Authorization', 'Bearer local.signed.token')
      .expect(200);

    expect((first.body as ApiBody).data).toEqual((second.body as ApiBody).data);
    expect((first.body as ApiBody).data.analysis).toMatchObject({
      score: { correct: 2, total: 20, answered: 3 },
      accuracy: 67,
      time: {
        limitSeconds: 1200,
        usedSeconds: 125,
        remainingSeconds: 1075,
      },
    });
    expect((first.body as ApiBody).data).toMatchObject({
      remediation: {
        status: 'ready',
        count: 1,
        href: '/error-notebook?source=TOEIC_TIMED_TEST',
      },
    });
    const packs = (first.body as ApiBody).data.remediation as {
      packs?: unknown;
    };
    expect(Array.isArray(packs.packs)).toBe(true);
    expect(JSON.stringify(packs.packs)).toContain('toeicPart=2');
    expect(JSON.stringify(first.body)).not.toMatch(
      /questionId|selectedOption|isCorrect|correctAnswer|userId|license|reviewStatus|publication|provider/,
    );

    repository.find.mockResolvedValue(makeSession());
    await request(app.getHttpServer())
      .get('/api/v1/toeic/tests/sessions/timed-session-1/analysis')
      .set('Authorization', 'Bearer local.signed.token')
      .expect(409);

    repository.find.mockResolvedValue(null);
    await request(app.getHttpServer())
      .get('/api/v1/toeic/tests/sessions/not-owned/analysis')
      .set('Authorization', 'Bearer local.signed.token')
      .expect(404);
  });

  it('returns an authenticated, bounded, source-filtered Error Notebook page', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/quiz/session/summary/errors')
      .query({ page: 2, size: 1, source: 'TOEIC_TIMED_TEST' })
      .set('Authorization', 'Bearer local.signed.token')
      .expect(200);

    expect((response.body as ApiBody).data).toMatchObject({
      pagination: { page: 2, size: 1, total: 2, hasNext: false },
    });
    expect(practiceRepository.errors).toHaveBeenCalledWith(
      principal.applicationUserId,
      { page: 2, size: 1, source: 'TOEIC_TIMED_TEST' },
    );
    expect(JSON.stringify(response.body)).not.toMatch(
      /userId|correctAnswer|provider|rightsOwner|publicationState/,
    );
  });

  it('rejects unauthenticated and out-of-bounds Error Notebook queries', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/quiz/session/summary/errors')
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/quiz/session/summary/errors')
      .query({ page: 0, size: 51, source: 'UNKNOWN' })
      .set('Authorization', 'Bearer local.signed.token')
      .expect(400);
    expect(practiceRepository.errors).toHaveBeenCalledTimes(0);
  });

  it('does not expose notebook rows when the authenticated owner changes', async () => {
    practiceRepository.errors.mockResolvedValueOnce({
      entries: [],
      pagination: { page: 1, size: 20, total: 0, hasNext: false },
    });
    resolvePrincipal.mockResolvedValueOnce(alternatePrincipal);

    const response = await request(app.getHttpServer())
      .get('/api/v1/quiz/session/summary/errors')
      .set('Authorization', 'Bearer local.signed.token')
      .expect(200);

    expect((response.body as ApiBody).data.entries).toEqual([]);
    expect(practiceRepository.errors).toHaveBeenCalledWith('another-learner', {
      page: 1,
      size: 20,
    });
    expect(JSON.stringify(response.body)).not.toContain('timed-question-2');
  });

  it('returns an explicit empty remediation state when no TOEIC errors were captured', async () => {
    captureErrors.mockResolvedValueOnce(0);
    const final = makeSession({
      status: 'SUBMITTED',
      score: 20,
      finalizedAt: new Date('2026-08-06T00:02:05.000Z'),
    });
    repository.find.mockResolvedValue(final);
    const response = await request(app.getHttpServer())
      .get('/api/v1/toeic/tests/sessions/timed-session-1/analysis')
      .set('Authorization', 'Bearer local.signed.token')
      .expect(200);

    expect((response.body as ApiBody).data.remediation).toEqual({
      status: 'empty',
      count: 0,
      href: null,
      packs: [],
    });
  });

  it('returns HALF analysis totals from the finalized server snapshot', async () => {
    const half = halfCatalogue();
    const final = makeSession({
      mode: 'HALF',
      status: 'EXPIRED',
      total: 50,
      questionIds: half.map((item) => item.id),
      deadlineAt: new Date('2026-08-06T00:45:00.000Z'),
      finalizedAt: new Date('2026-08-06T00:45:00.000Z'),
    });
    repository.find.mockResolvedValue(final);
    repository.finalizedQuestionsByIds.mockResolvedValue(half);

    const response = await request(app.getHttpServer())
      .get('/api/v1/toeic/tests/sessions/timed-session-1/analysis')
      .set('Authorization', 'Bearer local.signed.token')
      .expect(200);

    expect((response.body as ApiBody).data.analysis).toMatchObject({
      score: { correct: 0, total: 50, answered: 0 },
      skills: [
        expect.objectContaining({ skill: 'LISTENING', total: 25 }),
        expect.objectContaining({ skill: 'READING', total: 25 }),
      ],
      time: { limitSeconds: 2700, usedSeconds: 2700, remainingSeconds: 0 },
    });
  });

  it('sanitizes malformed analysis snapshots and repository failures', async () => {
    const final = makeSession({
      status: 'SUBMITTED',
      finalizedAt: new Date('2026-08-06T00:02:05.000Z'),
    });
    repository.find.mockResolvedValue(final);
    repository.finalizedQuestionsByIds.mockResolvedValue([
      ...questions,
      questions[0],
    ]);
    await request(app.getHttpServer())
      .get('/api/v1/toeic/tests/sessions/timed-session-1/analysis')
      .set('Authorization', 'Bearer local.signed.token')
      .expect(422);

    repository.finalizedQuestionsByIds.mockRejectedValue(new Error('database'));
    await request(app.getHttpServer())
      .get('/api/v1/toeic/tests/sessions/timed-session-1/analysis')
      .set('Authorization', 'Bearer local.signed.token')
      .expect(500)
      .expect(({ body }) => {
        expect(JSON.stringify(body)).not.toContain('database');
      });
  });

  it('rejects an incomplete submit before the deadline', async () => {
    repository.finalize.mockResolvedValue({
      state: 'incomplete',
      session: makeSession(),
    });
    await request(app.getHttpServer())
      .post('/api/v1/toeic/tests/sessions/timed-session-1/submit')
      .set('Authorization', 'Bearer local.signed.token')
      .expect(422);
  });

  it('keeps answer ownership fail-closed', async () => {
    repository.find.mockResolvedValue(null);
    await request(app.getHttpServer())
      .post('/api/v1/toeic/tests/sessions/not-owned/answers')
      .set('Authorization', 'Bearer local.signed.token')
      .send({ questionId: questions[0].id, selectedOption: 'A' })
      .expect(404);
  });

  it('fails closed on a malformed persisted snapshot', async () => {
    repository.safeQuestionsByIds.mockResolvedValue([
      ...questions
        .slice(0, 20)
        .map((item, index) =>
          index === 0 ? { ...item, options: [{ id: 'A', text: '' }] } : item,
        ),
    ]);
    await request(app.getHttpServer())
      .get('/api/v1/toeic/tests/sessions/timed-session-1')
      .set('Authorization', 'Bearer local.signed.token')
      .expect(422);
  });

  it('does not reveal whether a session belongs to another learner', async () => {
    repository.find.mockResolvedValue(null);
    await request(app.getHttpServer())
      .get('/api/v1/toeic/tests/sessions/not-owned/result')
      .set('Authorization', 'Bearer local.signed.token')
      .expect(404);
  });
});
