import { createApplicationPrincipal } from '../access';
import {
  ToeicDifficulty,
  ToeicPart,
  ToeicQuestionType,
} from '../../generated/prisma/enums';
import { TOEIC_ERROR_CODES, ToeicQuestionError } from './toeic-question.error';
import type {
  TimedPrivateQuestion,
  TimedSession,
  TimedSessionCreate,
  ToeicTimedTestRepository,
} from './toeic-timed-test.models';
import { ToeicTimedTestService } from './toeic-timed-test.service';
import { buildTimedTestAnalysis } from './toeic-timed-test.analysis';

const principal = createApplicationPrincipal({
  applicationUserId: 'timed-learner',
  externalIdentity: {
    provider: 'fixture',
    subject: 'timed-learner',
    issuer: 'issuer',
    audience: 'audience',
  },
  roles: ['FREE_USER'],
  ownerships: [],
  entitlements: [],
});

const baseTime = new Date('2026-08-06T00:00:00.000Z');

function question(part: ToeicPart, index: number): TimedPrivateQuestion {
  return {
    id: `version-${index}`,
    questionId: `question-${index}`,
    prompt: `Prompt ${index}`,
    options: [
      { id: 'A', text: 'Correct' },
      { id: 'B', text: 'Other' },
    ],
    part,
    questionType:
      part <= ToeicPart.PART_4
        ? ToeicQuestionType.PHOTO_DESCRIPTION
        : ToeicQuestionType.INCOMPLETE_SENTENCE,
    difficulty: ToeicDifficulty.ELEMENTARY,
    topic: null,
    stimulusGroup: null,
    mediaReference: null,
    explanation: null,
    correctAnswer: 'A',
  };
}

function catalogue(): TimedPrivateQuestion[] {
  return [
    question(ToeicPart.PART_1, 1),
    question(ToeicPart.PART_2, 2),
    question(ToeicPart.PART_2, 3),
    question(ToeicPart.PART_3, 4),
    question(ToeicPart.PART_3, 5),
    question(ToeicPart.PART_3, 6),
    question(ToeicPart.PART_3, 7),
    question(ToeicPart.PART_4, 8),
    question(ToeicPart.PART_4, 9),
    question(ToeicPart.PART_4, 10),
    question(ToeicPart.PART_5, 11),
    question(ToeicPart.PART_5, 12),
    question(ToeicPart.PART_5, 13),
    question(ToeicPart.PART_6, 14),
    question(ToeicPart.PART_6, 15),
    question(ToeicPart.PART_7, 16),
    question(ToeicPart.PART_7, 17),
    question(ToeicPart.PART_7, 18),
    question(ToeicPart.PART_7, 19),
    question(ToeicPart.PART_7, 20),
  ];
}

function halfCatalogue(): TimedPrivateQuestion[] {
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

function session(input: Partial<TimedSession> = {}): TimedSession {
  return {
    id: 'timed-session-1',
    userId: principal.applicationUserId,
    clientSessionId: 'timed-client-1',
    mode: 'MINI',
    policyVersion: 'v1',
    questionIds: catalogue().map((item) => item.id),
    startedAt: baseTime,
    deadlineAt: new Date(baseTime.getTime() + 20 * 60 * 1000),
    status: 'ACTIVE',
    total: 20,
    score: null,
    finalizedAt: null,
    answers: [],
    ...input,
  };
}

function repository(
  overrides: Partial<jest.Mocked<ToeicTimedTestRepository>> = {},
) {
  const created = jest.fn((input: TimedSessionCreate) =>
    session({
      clientSessionId: input.clientSessionId,
      mode: input.mode,
      policyVersion: input.policyVersion,
      questionIds: [...input.questionIds],
      startedAt: input.startedAt,
      deadlineAt: input.deadlineAt,
      total: input.total,
    }),
  );
  return {
    eligibleQuestions: jest.fn().mockResolvedValue(catalogue()),
    safeQuestionsByIds: jest.fn((ids: readonly string[]) =>
      catalogue().filter((item) => ids.includes(item.id)),
    ),
    privateQuestionsByIds: jest.fn((ids: readonly string[]) =>
      catalogue().filter((item) => ids.includes(item.id)),
    ),
    finalizedQuestionsByIds: jest.fn((ids: readonly string[]) =>
      catalogue().filter((item) => ids.includes(item.id)),
    ),
    findByClient: jest.fn().mockResolvedValue(null),
    find: jest.fn().mockResolvedValue(session()),
    create: created,
    createAnswer: jest.fn().mockResolvedValue('created'),
    finalize: jest
      .fn()
      .mockResolvedValue({ state: 'incomplete', session: session() }),
    ...overrides,
  } as jest.Mocked<ToeicTimedTestRepository>;
}

describe('ToeicTimedTestService', () => {
  it('assembles a governed mini test and keeps the answer key private', async () => {
    const repo = repository();
    const result = await new ToeicTimedTestService(repo, () => baseTime).start(
      principal,
      { clientSessionId: 'client-123', mode: 'MINI' },
    );

    expect(result.replayed).toBe(false);
    expect(result.questions).toHaveLength(20);
    expect(result.session.total).toBe(20);
    expect(JSON.stringify(result)).not.toContain('correctAnswer');
    expect(repo.create.mock.calls).toContainEqual([
      expect.objectContaining({ mode: 'MINI', total: 20 }),
    ]);
  });

  it('replays the same mode and conflicts on a changed mode', async () => {
    const repo = repository({
      findByClient: jest.fn().mockResolvedValue(session()),
    });
    const service = new ToeicTimedTestService(repo, () => baseTime);
    await expect(
      service.start(principal, {
        clientSessionId: 'timed-client-1',
        mode: 'MINI',
      }),
    ).resolves.toMatchObject({ replayed: true });
    await expect(
      service.start(principal, {
        clientSessionId: 'timed-client-1',
        mode: 'HALF',
      }),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.CONFLICT });
  });

  it('recovers a unique start race by replaying the winning session', async () => {
    const winner = session({ clientSessionId: 'race-client-1' });
    const uniqueError = Object.assign(new Error('unique'), { code: 'P2002' });
    const repo = repository({
      create: jest.fn().mockRejectedValue(uniqueError),
      findByClient: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(winner),
    });
    await expect(
      new ToeicTimedTestService(repo, () => baseTime).start(principal, {
        clientSessionId: 'race-client-1',
        mode: 'MINI',
      }),
    ).resolves.toMatchObject({ replayed: true });
  });

  it('assembles the exact half-test shape and server deadline', async () => {
    const half = halfCatalogue();
    const repo = repository({
      eligibleQuestions: jest.fn().mockResolvedValue(half),
    });
    const result = await new ToeicTimedTestService(repo, () => baseTime).start(
      principal,
      { clientSessionId: 'half-client-123', mode: 'HALF' },
    );

    expect(result.questions).toHaveLength(50);
    expect(result.session.total).toBe(50);
    expect(result.session.deadlineAt).toEqual(
      new Date(baseTime.getTime() + 45 * 60 * 1000),
    );
    expect(repo.create.mock.calls).toContainEqual([
      expect.objectContaining({ mode: 'HALF', total: 50 }),
    ]);
  });

  it('fails closed when a required Part quota is unavailable', async () => {
    const repo = repository({
      eligibleQuestions: jest
        .fn()
        .mockResolvedValue(
          catalogue().filter((item) => item.part !== ToeicPart.PART_7),
        ),
    });
    await expect(
      new ToeicTimedTestService(repo, () => baseTime).start(principal, {
        clientSessionId: 'client-123',
        mode: 'MINI',
      }),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.NOT_FOUND });
  });

  it('keeps answers immutable and finalizes only after all answers', async () => {
    const repo = repository();
    const service = new ToeicTimedTestService(repo, () => baseTime);
    await expect(
      service.answer(principal, 'timed-session-1', {
        questionId: 'version-1',
        selectedOption: 'A',
      }),
    ).resolves.toMatchObject({ accepted: true, replayed: false });
    repo.find.mockResolvedValue(
      session({
        answers: [
          {
            questionId: 'version-1',
            selectedOption: 'A',
            isCorrect: true,
            answeredAt: baseTime,
          },
        ],
      }),
    );
    await expect(
      service.answer(principal, 'timed-session-1', {
        questionId: 'version-1',
        selectedOption: 'B',
      }),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.CONFLICT });
    await expect(
      service.submit(principal, 'timed-session-1'),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.INCOMPLETE });
  });

  it('validates the persisted snapshot before accepting an identical retry', async () => {
    const repo = repository({
      find: jest.fn().mockResolvedValue(
        session({
          answers: [
            {
              questionId: 'version-1',
              selectedOption: 'A',
              isCorrect: true,
              answeredAt: baseTime,
            },
          ],
        }),
      ),
      privateQuestionsByIds: jest.fn().mockResolvedValue([]),
    });
    await expect(
      new ToeicTimedTestService(repo, () => baseTime).answer(
        principal,
        'timed-session-1',
        { questionId: 'version-1', selectedOption: 'A' },
      ),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.NOT_FOUND });
    expect(repo.createAnswer.mock.calls).toHaveLength(0);
  });

  it('replays an identical answer and reports fresh progress after a concurrent write', async () => {
    const first = session();
    const current = session({
      answers: [
        {
          questionId: 'version-1',
          selectedOption: 'A',
          isCorrect: true,
          answeredAt: baseTime,
        },
      ],
    });
    const repo = repository({
      find: jest
        .fn()
        .mockResolvedValueOnce(first)
        .mockResolvedValueOnce(current),
      createAnswer: jest.fn().mockResolvedValue('replayed'),
    });
    await expect(
      new ToeicTimedTestService(repo, () => baseTime).answer(
        principal,
        'timed-session-1',
        { questionId: 'version-1', selectedOption: 'A' },
      ),
    ).resolves.toMatchObject({ replayed: true, answered: 1, total: 20 });
  });

  it('maps an answer/submit race to one closed write and one final result', async () => {
    const finalized = session({
      status: 'SUBMITTED',
      score: 1,
      finalizedAt: baseTime,
    });
    const repo = repository({
      createAnswer: jest.fn().mockResolvedValue('closed'),
      finalize: jest.fn().mockResolvedValue({
        state: 'finalized',
        session: finalized,
      }),
    });
    const [answer, submit] = await Promise.allSettled([
      new ToeicTimedTestService(repo, () => baseTime).answer(
        principal,
        'timed-session-1',
        { questionId: 'version-1', selectedOption: 'A' },
      ),
      new ToeicTimedTestService(repo, () => baseTime).submit(
        principal,
        'timed-session-1',
      ),
    ]);
    expect(answer.status).toBe('rejected');
    expect((answer as PromiseRejectedResult).reason).toMatchObject({
      code: TOEIC_ERROR_CODES.CONFLICT,
    });
    expect(submit).toMatchObject({
      status: 'fulfilled',
      value: { session: { status: 'SUBMITTED', score: 1 } },
    });
  });

  it('maps repository failures to a sanitized error', async () => {
    const repo = repository({
      eligibleQuestions: jest
        .fn()
        .mockRejectedValue(new Error('database credentials leaked')),
    });
    await expect(
      new ToeicTimedTestService(repo, () => baseTime).start(principal, {
        clientSessionId: 'client-123',
        mode: 'MINI',
      }),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.REPOSITORY_FAILURE });
  });

  it('keeps owner isolation fail-closed', async () => {
    const repo = repository({ find: jest.fn().mockResolvedValue(null) });
    await expect(
      new ToeicTimedTestService(repo, () => baseTime).get(
        principal,
        'belongs-to-someone-else',
      ),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.NOT_FOUND });
    expect(repo.find.mock.calls).toContainEqual([
      'belongs-to-someone-else',
      principal.applicationUserId,
    ]);
  });

  it('finalizes an expired session and exposes score only after finalization', async () => {
    const now = new Date(baseTime.getTime() + 20 * 60 * 1000);
    const final = session({
      status: 'EXPIRED',
      score: 1,
      finalizedAt: now,
      answers: [
        {
          questionId: 'version-1',
          selectedOption: 'A',
          isCorrect: true,
          answeredAt: baseTime,
        },
      ],
    });
    const repo = repository({
      finalize: jest
        .fn()
        .mockResolvedValue({ state: 'finalized', session: final }),
    });
    const result = await new ToeicTimedTestService(repo, () => now).result(
      principal,
      'timed-session-1',
    );
    expect(result.session.status).toBe('EXPIRED');
    expect(result.session.score).toBe(1);
    expect(JSON.stringify(result)).not.toContain('isCorrect');
  });

  it('captures an expired session finalized during a general session read', async () => {
    const now = new Date(baseTime.getTime() + 20 * 60 * 1000);
    const final = session({
      status: 'EXPIRED',
      score: 0,
      finalizedAt: now,
      answers: [
        {
          questionId: 'version-2',
          selectedOption: 'B',
          isCorrect: false,
          answeredAt: baseTime,
        },
      ],
    });
    const capture = jest.fn().mockResolvedValue(1);
    const repo = repository({
      find: jest
        .fn()
        .mockResolvedValue(
          session({ deadlineAt: new Date(now.getTime() - 1) }),
        ),
      finalize: jest.fn().mockResolvedValue({
        state: 'finalized',
        session: final,
      }),
    });

    const result = await new ToeicTimedTestService(
      repo,
      () => now,
      capture,
    ).get(principal, final.id);

    expect(result.session.status).toBe('EXPIRED');
    expect(capture).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: final.id }),
    );
  });

  it('reconciles repeated finalization reads without changing the final result', async () => {
    const final = session({
      status: 'SUBMITTED',
      score: 17,
      finalizedAt: baseTime,
    });
    const capture = jest.fn().mockResolvedValue(1);
    const repo = repository({
      finalize: jest
        .fn()
        .mockResolvedValueOnce({ state: 'finalized', session: final })
        .mockResolvedValueOnce({ state: 'already-finalized', session: final }),
    });
    const service = new ToeicTimedTestService(repo, () => baseTime, capture);

    const results = await Promise.all([
      service.submit(principal, final.id),
      service.submit(principal, final.id),
    ]);

    expect(results.map(({ session: value }) => value.score)).toEqual([17, 17]);
    expect(capture).toHaveBeenCalledTimes(2);
    expect(repo.finalize.mock.calls).toHaveLength(2);
  });

  it('builds deterministic aggregate analysis without per-question disclosure', () => {
    const final = session({
      status: 'SUBMITTED',
      score: 2,
      finalizedAt: new Date(baseTime.getTime() + 125 * 1000),
      answers: [
        {
          questionId: 'version-1',
          selectedOption: 'A',
          isCorrect: true,
          answeredAt: baseTime,
        },
        {
          questionId: 'version-2',
          selectedOption: 'B',
          isCorrect: false,
          answeredAt: new Date(baseTime.getTime() + 60 * 1000),
        },
        {
          questionId: 'version-11',
          selectedOption: 'A',
          isCorrect: true,
          answeredAt: new Date(baseTime.getTime() + 100 * 1000),
        },
      ],
    });
    const analysis = buildTimedTestAnalysis(final, catalogue());

    expect(analysis.score).toEqual({ correct: 2, total: 20, answered: 3 });
    expect(analysis.accuracy).toBe(67);
    expect(analysis.skills).toEqual([
      expect.objectContaining({ skill: 'LISTENING', total: 10, answered: 2 }),
      expect.objectContaining({ skill: 'READING', total: 10, answered: 1 }),
    ]);
    expect(analysis.parts[0]).toMatchObject({
      part: ToeicPart.PART_1,
      total: 1,
      correct: 1,
      accuracy: 100,
    });
    expect(analysis.weaknesses[0]).toMatchObject({
      name: 'Part 2',
      accuracy: 0,
      answered: 1,
    });
    expect(analysis.time).toEqual({
      limitSeconds: 1200,
      usedSeconds: 125,
      remainingSeconds: 1075,
      averageSecondsPerAnswered: 41.7,
    });
    expect(JSON.stringify(analysis)).not.toMatch(
      /questionId|selectedOption|isCorrect|correctAnswer|userId/,
    );

    const tie = buildTimedTestAnalysis(
      session({
        status: 'SUBMITTED',
        finalizedAt: new Date(baseTime.getTime() + 1_000),
        answers: [
          ...['version-2', 'version-4', 'version-11'].map((questionId) => ({
            questionId,
            selectedOption: 'B',
            isCorrect: false,
            answeredAt: baseTime,
          })),
        ],
      }),
      catalogue(),
    );
    expect(tie.weaknesses.map((item) => item.name)).toEqual([
      'Part 2',
      'Part 3',
      'Part 5',
    ]);

    const boundary = buildTimedTestAnalysis(
      session({
        status: 'SUBMITTED',
        finalizedAt: new Date(baseTime.getTime() + 1_000),
        answers: [
          {
            questionId: 'version-1',
            selectedOption: 'A',
            isCorrect: true,
            answeredAt: baseTime,
          },
          {
            questionId: 'version-2',
            selectedOption: 'B',
            isCorrect: false,
            answeredAt: baseTime,
          },
          {
            questionId: 'version-3',
            selectedOption: 'B',
            isCorrect: false,
            answeredAt: baseTime,
          },
        ],
      }),
      catalogue(),
    );
    expect(boundary.accuracy).toBe(33);
    expect(boundary.time.averageSecondsPerAnswered).toBe(0.3);
  });

  it('captures only finalized incorrect answers and returns a safe remediation state', async () => {
    const final = session({
      status: 'SUBMITTED',
      score: 1,
      finalizedAt: new Date(baseTime.getTime() + 1_000),
      answers: [
        {
          questionId: 'version-1',
          selectedOption: 'A',
          isCorrect: true,
          answeredAt: baseTime,
        },
        {
          questionId: 'version-2',
          selectedOption: 'B',
          isCorrect: false,
          answeredAt: baseTime,
        },
      ],
    });
    const capture = jest.fn().mockResolvedValue(1);
    const repo = repository({
      find: jest.fn().mockResolvedValue(final),
    });

    const result = await new ToeicTimedTestService(
      repo,
      () => baseTime,
      capture,
    ).analysis(principal, final.id);

    expect(capture).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: principal.applicationUserId,
        sessionId: final.id,
        answers: [
          expect.objectContaining({ questionId: 'version-1', isCorrect: true }),
          expect.objectContaining({
            questionId: 'version-2',
            isCorrect: false,
          }),
        ],
      }),
    );
    expect(result.remediation).toEqual({
      status: 'ready',
      count: 1,
      href: '/error-notebook?source=TOEIC_TIMED_TEST',
      packs: [],
    });
    expect(JSON.stringify(result)).not.toMatch(
      /correctAnswer|isCorrect|selectedOption|questionId|userId/,
    );
  });

  it('keeps the finalized analysis available when notebook capture is unavailable', async () => {
    const final = session({
      status: 'EXPIRED',
      finalizedAt: new Date(baseTime.getTime() + 1_000),
    });
    const repo = repository({ find: jest.fn().mockResolvedValue(final) });
    const capture = jest
      .fn()
      .mockRejectedValue(new Error('notebook unavailable'));

    const result = await new ToeicTimedTestService(
      repo,
      () => baseTime,
      capture,
    ).analysis(principal, final.id);

    expect(result.analysis.score.total).toBe(20);
    expect(result.remediation).toEqual({
      status: 'unavailable',
      count: 0,
      href: null,
      packs: [],
    });
  });

  it('fails closed for active, duplicate, or cross-snapshot analysis data', () => {
    expect(() => buildTimedTestAnalysis(session(), catalogue())).toThrow(
      TOEIC_ERROR_CODES.INVALID_CONTENT,
    );
    const final = session({
      status: 'EXPIRED',
      finalizedAt: new Date(baseTime.getTime() + 1200 * 1000),
      answers: [],
    });
    expect(() =>
      buildTimedTestAnalysis(final, [...catalogue(), catalogue()[0]]),
    ).toThrow(TOEIC_ERROR_CODES.INVALID_CONTENT);
    expect(() =>
      buildTimedTestAnalysis(final, [
        { ...catalogue()[0], part: ToeicPart.PART_2 },
        ...catalogue().slice(1),
      ]),
    ).toThrow(TOEIC_ERROR_CODES.INVALID_CONTENT);
  });

  it('does not allow analysis to bypass owner or active-session boundaries', async () => {
    const activeRepo = repository();
    await expect(
      new ToeicTimedTestService(activeRepo, () => baseTime).analysis(
        principal,
        'timed-session-1',
      ),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.CONFLICT });

    const missingRepo = repository({ find: jest.fn().mockResolvedValue(null) });
    await expect(
      new ToeicTimedTestService(missingRepo, () => baseTime).analysis(
        principal,
        'other-owner-session',
      ),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.NOT_FOUND });
  });

  it('keeps HALF totals server-owned and maps every Part to its skill', () => {
    const questions = halfCatalogue();
    const final = session({
      mode: 'HALF',
      status: 'SUBMITTED',
      total: 50,
      questionIds: questions.map((item) => item.id),
      deadlineAt: new Date(baseTime.getTime() + 45 * 60 * 1000),
      finalizedAt: new Date(baseTime.getTime() + 45 * 60 * 1000),
      answers: questions.map((item) => ({
        questionId: item.id,
        selectedOption: 'A',
        isCorrect: true,
        answeredAt: baseTime,
      })),
    });

    const analysis = buildTimedTestAnalysis(final, questions);

    expect(analysis.score).toEqual({ correct: 50, total: 50, answered: 50 });
    expect(analysis.skills).toEqual([
      expect.objectContaining({ skill: 'LISTENING', total: 25, correct: 25 }),
      expect.objectContaining({ skill: 'READING', total: 25, correct: 25 }),
    ]);
    expect(analysis.parts.map((item) => item.total)).toEqual([
      2, 6, 10, 7, 8, 4, 13,
    ]);
    expect(analysis.time.limitSeconds).toBe(2700);
  });

  it('returns zero-answer expiry safely and clamps server time to the policy', () => {
    const final = session({
      status: 'EXPIRED',
      finalizedAt: new Date(baseTime.getTime() + 2 * 60 * 60 * 1000),
      answers: [],
    });

    const analysis = buildTimedTestAnalysis(final, catalogue());

    expect(analysis.score).toEqual({ correct: 0, total: 20, answered: 0 });
    expect(analysis.accuracy).toBe(0);
    expect(analysis.weaknesses).toEqual([]);
    expect(analysis.time).toEqual({
      limitSeconds: 1200,
      usedSeconds: 1200,
      remainingSeconds: 0,
      averageSecondsPerAnswered: 0,
    });
  });

  it('uses persisted policy version and rejects malformed finalized snapshots', () => {
    const final = session({
      status: 'SUBMITTED',
      finalizedAt: new Date(baseTime.getTime() + 1_000),
    });

    expect(() =>
      buildTimedTestAnalysis(
        { ...final, policyVersion: 'future-v2' },
        catalogue(),
      ),
    ).toThrow(TOEIC_ERROR_CODES.INVALID_CONTENT);
    expect(() =>
      buildTimedTestAnalysis(
        {
          ...final,
          finalizedAt: new Date(baseTime.getTime() - 1_000),
        },
        catalogue(),
      ),
    ).toThrow(TOEIC_ERROR_CODES.INVALID_CONTENT);
  });

  it('sanitizes analysis repository failures and malformed snapshots', async () => {
    const final = session({
      status: 'SUBMITTED',
      finalizedAt: new Date(baseTime.getTime() + 1_000),
    });
    const repositoryFailure = repository({
      find: jest.fn().mockResolvedValue(final),
      finalizedQuestionsByIds: jest
        .fn()
        .mockRejectedValue(new Error('db down')),
    });
    await expect(
      new ToeicTimedTestService(repositoryFailure, () => baseTime).analysis(
        principal,
        final.id,
      ),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.REPOSITORY_FAILURE });

    const malformed = repository({
      find: jest.fn().mockResolvedValue(final),
      finalizedQuestionsByIds: jest
        .fn()
        .mockResolvedValue([...catalogue(), catalogue()[0]]),
    });
    await expect(
      new ToeicTimedTestService(malformed, () => baseTime).analysis(
        principal,
        final.id,
      ),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.INVALID_CONTENT });
  });

  it('reconciles an expired active session before reading analysis', async () => {
    const final = session({
      status: 'EXPIRED',
      finalizedAt: new Date(baseTime.getTime() + 1200 * 1000),
      answers: [],
    });
    const repo = repository({
      find: jest
        .fn()
        .mockResolvedValue(
          session({ deadlineAt: new Date(baseTime.getTime() - 1_000) }),
        ),
      finalize: jest.fn().mockResolvedValue({
        state: 'finalized',
        session: final,
      }),
    });

    const result = await new ToeicTimedTestService(
      repo,
      () => baseTime,
    ).analysis(principal, final.id);

    expect(result.analysis.score.answered).toBe(0);
    expect(repo.finalize.mock.calls).toContainEqual([
      final.id,
      principal.applicationUserId,
      baseTime,
    ]);
  });

  it('maps malformed mode to the sanitized TOEIC error', async () => {
    await expect(
      new ToeicTimedTestService(repository(), () => baseTime).start(principal, {
        clientSessionId: 'client-123',
        mode: 'FULL',
      }),
    ).rejects.toBeInstanceOf(ToeicQuestionError);
  });
});
