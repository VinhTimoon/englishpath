jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

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
import { AuditService } from '../audit/audit.service';
import type { VocabularyService } from '../vocabulary/vocabulary.service';
import type { ToeicPracticeCatalogueService } from './toeic-practice-catalogue.service';

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
    version: 1,
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

function fullCatalogue(): TimedPrivateQuestion[] {
  const counts: Record<ToeicPart, number> = {
    PART_1: 6,
    PART_2: 25,
    PART_3: 39,
    PART_4: 30,
    PART_5: 30,
    PART_6: 16,
    PART_7: 54,
  };
  let index = 1000;
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

  it('assembles the exact FULL snapshot and server deadline through EP5-ST001', async () => {
    const full = fullCatalogue();
    const repo = repository({
      eligibleQuestions: jest.fn().mockResolvedValue(full),
    });
    const result = await new ToeicTimedTestService(repo, () => baseTime).start(
      principal,
      { clientSessionId: 'full-client-123', mode: 'FULL' },
    );

    expect(result.questions).toHaveLength(200);
    expect(result.session).toMatchObject({
      mode: 'FULL',
      total: 200,
      deadlineAt: new Date(baseTime.getTime() + 7200 * 1000),
    });
    expect(repo.create.mock.calls).toContainEqual([
      expect.objectContaining({
        mode: 'FULL',
        policyVersion: 'FULL-MOCK-BETA-V1',
        total: 200,
        questionIds: full.map((item) => item.id),
      }),
    ]);
    expect(JSON.stringify(result)).not.toMatch(
      /correctAnswer|isCorrect|sourceUrl|rightsOwner|reviewStatus|publicationState/,
    );
  });

  it('does not persist a FULL session when the governed catalogue is incomplete', async () => {
    const repo = repository({
      eligibleQuestions: jest
        .fn()
        .mockResolvedValue(fullCatalogue().slice(0, 199)),
    });

    await expect(
      new ToeicTimedTestService(repo, () => baseTime).start(principal, {
        clientSessionId: 'full-incomplete-client',
        mode: 'FULL',
      }),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.NOT_FOUND });
    expect(repo.create.mock.calls).toHaveLength(0);
  });

  it('does not persist a FULL session when a selected question projection is malformed', async () => {
    const malformed = fullCatalogue();
    malformed[0] = { ...malformed[0], options: [{ id: 'A' }] };
    const repo = repository({
      eligibleQuestions: jest.fn().mockResolvedValue(malformed),
    });

    await expect(
      new ToeicTimedTestService(repo, () => baseTime).start(principal, {
        clientSessionId: 'full-malformed-client',
        mode: 'FULL',
      }),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.INVALID_CONTENT });
    expect(repo.create.mock.calls).toHaveLength(0);
  });

  it('does not persist a FULL session when an unselected eligible row is malformed', async () => {
    const malformed = [
      ...fullCatalogue(),
      {
        ...question(ToeicPart.PART_7, 9999),
        options: [{ id: 'A' }],
      },
    ];
    const repo = repository({
      eligibleQuestions: jest.fn().mockResolvedValue(malformed),
    });

    await expect(
      new ToeicTimedTestService(repo, () => baseTime).start(principal, {
        clientSessionId: 'full-unselected-malformed-client',
        mode: 'FULL',
      }),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.INVALID_CONTENT });
    expect(repo.create.mock.calls).toHaveLength(0);
  });

  it('replays a FULL client session and rejects a mode conflict without creating another session', async () => {
    const full = fullCatalogue();
    const existing = session({
      clientSessionId: 'full-replay-client',
      mode: 'FULL',
      policyVersion: 'FULL-MOCK-BETA-V1',
      questionIds: full.map((item) => item.id),
      total: 200,
      deadlineAt: new Date(baseTime.getTime() + 7200 * 1000),
    });
    const repo = repository({
      findByClient: jest.fn().mockResolvedValue(existing),
      safeQuestionsByIds: jest.fn().mockResolvedValue(full),
    });
    const service = new ToeicTimedTestService(repo, () => baseTime);

    await expect(
      service.start(principal, {
        clientSessionId: 'full-replay-client',
        mode: 'FULL',
      }),
    ).resolves.toMatchObject({ replayed: true, session: { total: 200 } });
    await expect(
      service.start(principal, {
        clientSessionId: 'full-replay-client',
        mode: 'MINI',
      }),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.CONFLICT });
    expect(repo.create.mock.calls).toHaveLength(0);
  });

  it('grades a FULL answer from the immutable snapshot after live eligibility changes', async () => {
    const full = fullCatalogue();
    const active = session({
      mode: 'FULL',
      policyVersion: 'FULL-MOCK-BETA-V1',
      questionIds: full.map((item) => item.id),
      total: 200,
      deadlineAt: new Date(baseTime.getTime() + 7200 * 1000),
    });
    const repo = repository({
      find: jest.fn().mockResolvedValue(active),
      privateQuestionsByIds: jest.fn().mockResolvedValue([]),
      finalizedQuestionsByIds: jest.fn().mockResolvedValue([full[0]]),
    });

    await expect(
      new ToeicTimedTestService(repo, () => baseTime).answer(
        principal,
        active.id,
        { questionId: full[0].id, selectedOption: 'A' },
      ),
    ).resolves.toMatchObject({ accepted: true, total: 200 });
    expect(repo.privateQuestionsByIds.mock.calls).toHaveLength(0);
    expect(repo.finalizedQuestionsByIds.mock.calls).toContainEqual([
      [full[0].id],
    ]);
  });

  it('keeps FULL expiry and incomplete-submit decisions server-owned', async () => {
    const full = fullCatalogue();
    const active = session({
      mode: 'FULL',
      policyVersion: 'FULL-MOCK-BETA-V1',
      questionIds: full.map((item) => item.id),
      total: 200,
      deadlineAt: new Date(baseTime.getTime() + 7200 * 1000),
    });
    const expired = session({
      ...active,
      status: 'EXPIRED',
      finalizedAt: new Date(baseTime.getTime() + 7200 * 1000),
      score: 0,
    });
    const repo = repository({
      find: jest.fn().mockResolvedValue(active),
      finalize: jest.fn().mockResolvedValue({
        state: 'finalized',
        session: expired,
      }),
    });
    const expiredService = new ToeicTimedTestService(
      repo,
      () => new Date(baseTime.getTime() + 7200 * 1000),
    );
    const expiredAnswer = () =>
      expiredService.answer(principal, active.id, {
        questionId: full[0].id,
        selectedOption: 'A',
      });
    await expect(expiredAnswer()).rejects.toMatchObject({
      code: TOEIC_ERROR_CODES.CONFLICT,
    });
    expect(repo.finalize.mock.calls).toContainEqual([
      active.id,
      principal.applicationUserId,
      new Date(baseTime.getTime() + 7200 * 1000),
    ]);

    const incompleteRepo = repository({
      find: jest.fn().mockResolvedValue(active),
      finalize: jest.fn().mockResolvedValue({
        state: 'incomplete',
        session: active,
      }),
    });
    const incompleteSubmit = () =>
      new ToeicTimedTestService(incompleteRepo, () => baseTime).submit(
        principal,
        active.id,
      );
    await expect(incompleteSubmit()).rejects.toMatchObject({
      code: TOEIC_ERROR_CODES.INCOMPLETE,
    });
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
      finalizedQuestionsByIds: jest.fn().mockResolvedValue([]),
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

  it('records bounded audit evidence for answer replay and conflict', async () => {
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
    });
    const audit = { append: jest.fn().mockResolvedValue(undefined) };
    const service = new ToeicTimedTestService(
      repo,
      () => baseTime,
      undefined,
      undefined,
      undefined,
      audit as never,
    );

    await expect(
      service.answer(
        principal,
        'timed-session-1',
        { questionId: 'version-1', selectedOption: 'A' },
        'corr-replay-001',
      ),
    ).resolves.toMatchObject({ replayed: true });
    await expect(
      service.answer(
        principal,
        'timed-session-1',
        { questionId: 'version-1', selectedOption: 'B' },
        'corr-conflict-001',
      ),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.CONFLICT });

    expect(audit.append).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        actorUserId: principal.applicationUserId,
        action: 'TOEIC_ANSWER_REPLAY',
        target: 'toeic-session:timed-session-1',
        policyResult: 'ALLOW',
        correlationId: 'corr-replay-001',
        attributes: { outcome: 'ANSWER_REPLAY', capability: 'timed-test' },
      }),
    );
    expect(audit.append).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        action: 'TOEIC_ANSWER_CONFLICT',
        policyResult: 'DENY',
        correlationId: 'corr-conflict-001',
      }),
    );
    expect(JSON.stringify(audit.append.mock.calls)).not.toMatch(
      /selectedOption|correctAnswer|questionId|prompt|password|token/,
    );
  });

  it('records first late finalization and isolates audit persistence failure', async () => {
    const expired = session({
      status: 'EXPIRED',
      score: 0,
      finalizedAt: new Date(baseTime.getTime() + 1200 * 1000),
    });
    const repo = repository({
      finalize: jest.fn().mockResolvedValue({
        state: 'finalized',
        session: expired,
      }),
    });
    const audit = {
      append: jest.fn().mockRejectedValue(new Error('audit down')),
    };

    await expect(
      new ToeicTimedTestService(
        repo,
        () => new Date(baseTime.getTime() + 1200 * 1000),
        undefined,
        undefined,
        undefined,
        audit as never,
      ).submit(principal, expired.id, 'corr-late-001'),
    ).resolves.toMatchObject({
      session: { status: 'EXPIRED', score: 0 },
    });
    expect(audit.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TOEIC_FINALIZE_LATE',
        correlationId: 'corr-late-001',
        policyResult: 'DENY',
      }),
    );
  });

  it('records incomplete and late-answer audit actions', async () => {
    const audit = { append: jest.fn().mockResolvedValue(undefined) };
    const incompleteRepo = repository({
      finalize: jest.fn().mockResolvedValue({
        state: 'incomplete',
        session: session(),
      }),
    });
    await expect(
      new ToeicTimedTestService(
        incompleteRepo,
        () => baseTime,
        undefined,
        undefined,
        undefined,
        audit as never,
      ).submit(principal, 'timed-session-1', 'corr-incomplete-001'),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.INCOMPLETE });

    const full = fullCatalogue();
    const activeFull = session({
      mode: 'FULL',
      policyVersion: 'FULL-MOCK-BETA-V1',
      total: 200,
      questionIds: full.map((item) => item.id),
      deadlineAt: new Date(baseTime.getTime() - 1),
    });
    const lateRepo = repository({
      find: jest.fn().mockResolvedValue(activeFull),
      finalize: jest.fn().mockResolvedValue({
        state: 'finalized',
        session: {
          ...activeFull,
          status: 'EXPIRED',
          score: 0,
          finalizedAt: baseTime,
        },
      }),
      finalizedQuestionsByIds: jest.fn().mockResolvedValue([full[0]]),
    });
    await expect(
      new ToeicTimedTestService(
        lateRepo,
        () => baseTime,
        undefined,
        undefined,
        undefined,
        audit as never,
      ).answer(
        principal,
        activeFull.id,
        { questionId: full[0].id, selectedOption: 'A' },
        'corr-late-answer-001',
      ),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.CONFLICT });

    expect(audit.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TOEIC_FINALIZE_INCOMPLETE',
        correlationId: 'corr-incomplete-001',
      }),
    );
    expect(audit.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TOEIC_ANSWER_CLOSED',
        correlationId: 'corr-late-answer-001',
      }),
    );
  });

  it('passes timed-test audit evidence through the real redaction service', async () => {
    const auditRepository = { append: jest.fn().mockResolvedValue(undefined) };
    const audit = new AuditService(auditRepository as never);
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
    });

    await new ToeicTimedTestService(
      repo,
      () => baseTime,
      undefined,
      undefined,
      undefined,
      audit,
    ).answer(
      principal,
      'timed-session-1',
      { questionId: 'version-1', selectedOption: 'A' },
      'corr-redaction-001',
    );

    expect(auditRepository.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TOEIC_ANSWER_REPLAY',
        attributes: {
          outcome: 'ANSWER_REPLAY',
          capability: 'timed-test',
        },
      }),
    );
    expect(JSON.stringify(auditRepository.append.mock.calls)).not.toMatch(
      /selectedOption|correctAnswer|questionId|prompt|token|password|email/,
    );
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

  it('builds bounded server-owned vocabulary, grammar, and practice packs', async () => {
    const final = session({
      status: 'SUBMITTED',
      score: 0,
      finalizedAt: new Date(baseTime.getTime() + 1_000),
      answers: [
        {
          questionId: 'version-11',
          selectedOption: 'B',
          isCorrect: false,
          answeredAt: baseTime,
        },
      ],
    });
    let listTopicsInput: unknown;
    const listTopics = jest.fn((input: unknown) => {
      listTopicsInput = input;
      return Promise.resolve({ data: [{ id: 'workplace' }] });
    });
    const vocabulary = { listTopics } as unknown as VocabularyService;
    const catalogueService = {
      getCatalogue: jest.fn().mockResolvedValue({
        listening: { parts: [], difficulties: [] },
        reading: { parts: [ToeicPart.PART_5], difficulties: [], topics: [] },
      }),
    } as unknown as ToeicPracticeCatalogueService;
    const repo = repository({
      find: jest.fn().mockResolvedValue(final),
    });

    const result = await new ToeicTimedTestService(
      repo,
      () => baseTime,
      jest.fn().mockResolvedValue(1),
      vocabulary,
      catalogueService,
    ).analysis(principal, final.id);

    expect(listTopicsInput).toEqual({
      page: 1,
      size: 1,
      level: 'toeic-core',
      track: 'toeic-listening-reading',
      skill: 'reading',
      toeicPart: 5,
    });
    expect(result.remediation.packs).toEqual([
      expect.objectContaining({
        kind: 'VOCABULARY',
        href: '/vocabulary?level=toeic-core&track=toeic-listening-reading&skill=reading&toeicPart=5',
      }),
      expect.objectContaining({
        kind: 'GRAMMAR',
        href: '/blog/present-perfect-have-has',
      }),
      expect.objectContaining({
        kind: 'PRACTICE',
        href: '/toeic/practice?mode=reading&part=PART_5',
      }),
    ]);
    expect(result.remediation.packs.length).toBeLessThanOrEqual(6);
    expect(JSON.stringify(result.remediation.packs)).not.toMatch(
      /questionId|selectedOption|isCorrect|correctAnswer|userId/,
    );
  });

  it('maps HALF listening weaknesses and emits practice only for catalogue content', async () => {
    const half = halfCatalogue();
    const wrong = half.find((item) => item.part === ToeicPart.PART_2)!;
    const final = session({
      mode: 'HALF',
      total: 50,
      questionIds: half.map((item) => item.id),
      status: 'EXPIRED',
      score: 49,
      finalizedAt: new Date(baseTime.getTime() + 1_000),
      answers: [
        {
          questionId: wrong.id,
          selectedOption: 'B',
          isCorrect: false,
          answeredAt: baseTime,
        },
      ],
    });
    const vocabulary = {
      listTopics: jest.fn().mockResolvedValue({ data: [] }),
    } as unknown as VocabularyService;
    const catalogueService = {
      getCatalogue: jest.fn().mockResolvedValue({
        listening: {
          parts: [ToeicPart.PART_2],
          difficulties: [],
        },
        reading: { parts: [], difficulties: [], topics: [] },
      }),
    } as unknown as ToeicPracticeCatalogueService;
    const repo = repository({
      find: jest.fn().mockResolvedValue(final),
      finalizedQuestionsByIds: jest.fn().mockResolvedValue(half),
    });

    const result = await new ToeicTimedTestService(
      repo,
      () => baseTime,
      jest.fn().mockResolvedValue(1),
      vocabulary,
      catalogueService,
    ).analysis(principal, final.id);

    expect(result.analysis.score.total).toBe(50);
    expect(result.analysis.weaknesses[0]).toMatchObject({ name: 'Part 2' });
    expect(result.remediation.packs).toEqual([
      expect.objectContaining({
        kind: 'PRACTICE',
        href: '/toeic/practice?mode=listening&part=PART_2',
      }),
    ]);
  });

  it('maps HALF reading weaknesses to governed vocabulary, grammar, and practice packs', async () => {
    const half = halfCatalogue();
    const wrong = half.find((item) => item.part === ToeicPart.PART_5)!;
    const final = session({
      mode: 'HALF',
      total: 50,
      questionIds: half.map((item) => item.id),
      status: 'SUBMITTED',
      score: 49,
      finalizedAt: new Date(baseTime.getTime() + 1_000),
      answers: [
        {
          questionId: wrong.id,
          selectedOption: 'B',
          isCorrect: false,
          answeredAt: baseTime,
        },
      ],
    });
    const repo = repository({
      find: jest.fn().mockResolvedValue(final),
      finalizedQuestionsByIds: jest.fn().mockResolvedValue(half),
    });
    const result = await new ToeicTimedTestService(
      repo,
      () => baseTime,
      jest.fn().mockResolvedValue(1),
      {
        listTopics: jest.fn().mockResolvedValue({ data: [{ id: 'topic' }] }),
      } as unknown as VocabularyService,
      {
        getCatalogue: jest.fn().mockResolvedValue({
          listening: { parts: [], difficulties: [] },
          reading: {
            parts: [ToeicPart.PART_5],
            difficulties: [],
            topics: [],
          },
        }),
      } as unknown as ToeicPracticeCatalogueService,
    ).analysis(principal, final.id);

    expect(result.analysis.score.total).toBe(50);
    expect(result.remediation.packs.map((pack) => pack.kind)).toEqual([
      'VOCABULARY',
      'GRAMMAR',
      'PRACTICE',
    ]);
  });

  it('fails isolation-safe and stable when remediation content is unavailable', async () => {
    const final = session({
      status: 'SUBMITTED',
      score: 0,
      finalizedAt: new Date(baseTime.getTime() + 1_000),
      answers: [
        {
          questionId: 'version-16',
          selectedOption: 'B',
          isCorrect: false,
          answeredAt: baseTime,
        },
      ],
    });
    const vocabulary = {
      listTopics: jest
        .fn()
        .mockRejectedValue(new Error('taxonomy unavailable')),
    } as unknown as VocabularyService;
    const catalogueService = {
      getCatalogue: jest
        .fn()
        .mockRejectedValue(new Error('catalogue unavailable')),
    } as unknown as ToeicPracticeCatalogueService;
    const capture = jest.fn().mockResolvedValue(1);
    const repo = repository({ find: jest.fn().mockResolvedValue(final) });
    const service = new ToeicTimedTestService(
      repo,
      () => baseTime,
      capture,
      vocabulary,
      catalogueService,
    );

    const first = await service.analysis(principal, final.id);
    const second = await service.analysis(principal, final.id);
    expect(first.analysis.score).toEqual({
      correct: 0,
      total: 20,
      answered: 1,
    });
    expect(first.remediation.packs).toEqual([]);
    expect(second.remediation.packs).toEqual(first.remediation.packs);
    expect(capture).toHaveBeenCalledTimes(2);
  });

  it('keeps deterministic ordering, removes duplicate hrefs, and caps packs at six', async () => {
    const final = session({
      status: 'SUBMITTED',
      score: 0,
      finalizedAt: new Date(baseTime.getTime() + 1_000),
      answers: catalogue().map((item) => ({
        questionId: item.id,
        selectedOption: 'B',
        isCorrect: false,
        answeredAt: baseTime,
      })),
    });
    const vocabulary = {
      listTopics: jest.fn().mockResolvedValue({ data: [{ id: 'topic' }] }),
    } as unknown as VocabularyService;
    const catalogueService = {
      getCatalogue: jest.fn().mockResolvedValue({
        listening: {
          parts: [
            ToeicPart.PART_1,
            ToeicPart.PART_2,
            ToeicPart.PART_3,
            ToeicPart.PART_4,
          ],
          difficulties: [],
        },
        reading: { parts: [], difficulties: [], topics: [] },
      }),
    } as unknown as ToeicPracticeCatalogueService;
    const repo = repository({ find: jest.fn().mockResolvedValue(final) });

    const result = await new ToeicTimedTestService(
      repo,
      () => baseTime,
      jest.fn().mockResolvedValue(20),
      vocabulary,
      catalogueService,
    ).analysis(principal, final.id);

    expect(result.remediation.packs).toHaveLength(6);
    expect(result.remediation.packs.map((pack) => pack.href)).toEqual([
      '/vocabulary?level=toeic-core&track=toeic-listening-reading&skill=listening&toeicPart=1',
      '/toeic/practice?mode=listening&part=PART_1',
      '/vocabulary?level=toeic-core&track=toeic-listening-reading&skill=listening&toeicPart=2',
      '/toeic/practice?mode=listening&part=PART_2',
      '/vocabulary?level=toeic-core&track=toeic-listening-reading&skill=listening&toeicPart=3',
      '/toeic/practice?mode=listening&part=PART_3',
    ]);
    expect(
      new Set(result.remediation.packs.map((pack) => pack.href)).size,
    ).toBe(result.remediation.packs.length);
  });

  it('does not emit grammar packs for non-grammar Parts', async () => {
    const final = session({
      status: 'SUBMITTED',
      score: 0,
      finalizedAt: new Date(baseTime.getTime() + 1_000),
      answers: [
        {
          questionId: 'version-16',
          selectedOption: 'B',
          isCorrect: false,
          answeredAt: baseTime,
        },
      ],
    });
    const repo = repository({ find: jest.fn().mockResolvedValue(final) });
    const result = await new ToeicTimedTestService(
      repo,
      () => baseTime,
      jest.fn().mockResolvedValue(0),
      {
        listTopics: jest.fn().mockResolvedValue({ data: [] }),
      } as unknown as VocabularyService,
      {
        getCatalogue: jest.fn().mockResolvedValue({
          listening: { parts: [], difficulties: [] },
          reading: { parts: [ToeicPart.PART_7], difficulties: [], topics: [] },
        }),
      } as unknown as ToeicPracticeCatalogueService,
    ).analysis(principal, final.id);

    expect(result.remediation.packs).toEqual([
      expect.objectContaining({
        kind: 'PRACTICE',
        href: '/toeic/practice?mode=reading&part=PART_7',
      }),
    ]);
    expect(
      result.remediation.packs.some((pack) => pack.kind === 'GRAMMAR'),
    ).toBe(false);
  });

  it('preserves finalized analysis when a remediation catalogue is malformed', async () => {
    const final = session({
      status: 'EXPIRED',
      score: 4,
      finalizedAt: new Date(baseTime.getTime() + 1_000),
      answers: [
        {
          questionId: 'version-11',
          selectedOption: 'B',
          isCorrect: false,
          answeredAt: baseTime,
        },
      ],
    });
    const repo = repository({ find: jest.fn().mockResolvedValue(final) });
    const result = await new ToeicTimedTestService(
      repo,
      () => baseTime,
      jest.fn().mockResolvedValue(1),
      {
        listTopics: jest.fn().mockResolvedValue({ data: [{ id: 'topic' }] }),
      } as unknown as VocabularyService,
      {
        getCatalogue: jest.fn().mockResolvedValue({}),
      } as unknown as ToeicPracticeCatalogueService,
    ).analysis(principal, final.id);

    expect(result.analysis.score).toEqual({
      correct: 0,
      total: 20,
      answered: 1,
    });
    expect(result.remediation.packs).toEqual([]);
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

  it('scores FULL from the persisted 200-question snapshot across all Parts', () => {
    const questions = fullCatalogue();
    const final = session({
      mode: 'FULL',
      policyVersion: 'FULL-MOCK-BETA-V1',
      status: 'EXPIRED',
      total: 200,
      questionIds: questions.map((item) => item.id),
      deadlineAt: new Date(baseTime.getTime() + 7200 * 1000),
      finalizedAt: new Date(baseTime.getTime() + 7200 * 1000),
      answers: questions.slice(0, 7).map((item, index) => ({
        questionId: item.id,
        selectedOption: index % 2 === 0 ? 'A' : 'B',
        isCorrect: index % 2 === 0,
        answeredAt: baseTime,
      })),
    });

    const analysis = buildTimedTestAnalysis(final, questions);

    expect(analysis.score).toEqual({ correct: 4, total: 200, answered: 7 });
    expect(analysis.parts.map((item) => item.total)).toEqual([
      6, 25, 39, 30, 30, 16, 54,
    ]);
    expect(analysis.skills).toEqual([
      expect.objectContaining({ skill: 'LISTENING', total: 100 }),
      expect.objectContaining({ skill: 'READING', total: 100 }),
    ]);
    expect(analysis.time).toEqual({
      limitSeconds: 7200,
      usedSeconds: 7200,
      remainingSeconds: 0,
      averageSecondsPerAnswered: 1028.6,
    });
    expect(JSON.stringify(analysis)).not.toMatch(
      /questionId|selectedOption|isCorrect|correctAnswer|userId|provider|license/,
    );
  });

  it('keeps FULL zero-answer clamping and weakness ordering deterministic', () => {
    const questions = fullCatalogue();
    const zero = session({
      mode: 'FULL',
      policyVersion: 'FULL-MOCK-BETA-V1',
      status: 'EXPIRED',
      total: 200,
      questionIds: questions.map((item) => item.id),
      finalizedAt: new Date(baseTime.getTime() + 3 * 60 * 60 * 1000),
    });
    const zeroAnalysis = buildTimedTestAnalysis(zero, questions);
    expect(zeroAnalysis.score).toEqual({ correct: 0, total: 200, answered: 0 });
    expect(zeroAnalysis.weaknesses).toEqual([]);
    expect(zeroAnalysis.time).toEqual({
      limitSeconds: 7200,
      usedSeconds: 7200,
      remainingSeconds: 0,
      averageSecondsPerAnswered: 0,
    });

    const early = session({
      ...zero,
      status: 'SUBMITTED',
      finalizedAt: new Date(baseTime.getTime() + 1_000),
      answers: questions.slice(0, 7).map((item) => ({
        questionId: item.id,
        selectedOption: 'B',
        isCorrect: false,
        answeredAt: baseTime,
      })),
    });
    const earlyAnalysis = buildTimedTestAnalysis(early, questions);
    expect(earlyAnalysis.time).toEqual({
      limitSeconds: 7200,
      usedSeconds: 1,
      remainingSeconds: 7199,
      averageSecondsPerAnswered: 0.1,
    });
    expect(earlyAnalysis.weaknesses.map((item) => item.name)).toEqual([
      'Part 1',
      'Part 2',
      'LISTENING',
    ]);
  });

  it('fails closed for an incomplete FULL analysis snapshot', () => {
    const questions = fullCatalogue();
    const final = session({
      mode: 'FULL',
      policyVersion: 'FULL-MOCK-BETA-V1',
      status: 'SUBMITTED',
      total: 200,
      questionIds: questions.map((item) => item.id),
      finalizedAt: new Date(baseTime.getTime() + 1_000),
    });

    expect(() =>
      buildTimedTestAnalysis(final, questions.slice(0, 199)),
    ).toThrow(TOEIC_ERROR_CODES.INVALID_CONTENT);
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
