import { createApplicationPrincipal } from '../access';
import {
  ToeicDifficulty,
  ToeicPart,
  ToeicQuestionType,
} from '../../generated/prisma/enums';
import { TOEIC_ERROR_CODES } from './toeic-question.error';
import type {
  ToeicListeningPracticeRepository,
  ToeicListeningQuestion,
  ToeicPracticeSessionRecord,
} from './toeic-listening-practice.models';
import { ToeicListeningPracticeService } from './toeic-listening-practice.service';

const principal = createApplicationPrincipal({
  applicationUserId: 'learner-1',
  externalIdentity: {
    provider: 'fixture',
    subject: 'learner-1',
    issuer: 'issuer',
    audience: 'audience',
  },
  roles: ['LEARNER'],
  ownerships: [],
  entitlements: [],
});

const question: ToeicListeningQuestion = {
  id: 'version-1',
  questionId: 'question-1',
  prompt: 'What is the speaker doing?',
  options: [
    { id: 'A', text: 'Standing' },
    { id: 'B', text: 'Sitting' },
  ],
  part: ToeicPart.PART_1,
  questionType: ToeicQuestionType.PHOTO_DESCRIPTION,
  difficulty: ToeicDifficulty.ELEMENTARY,
  mediaReference: null,
};

function session(
  overrides: Partial<ToeicPracticeSessionRecord> = {},
): ToeicPracticeSessionRecord {
  return {
    id: 'session-1',
    userId: 'learner-1',
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

function repository(
  overrides: Partial<jest.Mocked<ToeicListeningPracticeRepository>> = {},
) {
  return {
    eligibleQuestions: jest.fn().mockResolvedValue([question]),
    safeQuestionsByIds: jest.fn().mockResolvedValue([question]),
    privateQuestionsByIds: jest
      .fn()
      .mockResolvedValue([
        { id: 'version-1', options: question.options, correctAnswer: 'A' },
      ]),
    findSession: jest.fn(),
    findByClient: jest.fn().mockResolvedValue(null),
    createSession: jest.fn().mockResolvedValue(session()),
    createAnswer: jest.fn().mockResolvedValue(true),
    submitSession: jest.fn().mockResolvedValue(true),
    ...overrides,
  } as jest.Mocked<ToeicListeningPracticeRepository>;
}

describe('ToeicListeningPracticeService', () => {
  it('creates a safe, bounded listening session', async () => {
    const repo = repository();
    const result = await new ToeicListeningPracticeService(repo).start(
      principal,
      {
        clientSessionId: 'client-1',
        listeningPart: ToeicPart.PART_1,
        questionCount: 1,
      },
    );

    expect(result.replayed).toBe(false);
    expect(result.questions).toHaveLength(1);
    expect(JSON.stringify(result)).not.toContain('correctAnswer');
    expect(repo.createSession.mock.calls).toContainEqual([
      expect.objectContaining({ questionIds: ['version-1'], total: 1 }),
    ]);
  });

  it('replays the same client session and rejects a conflicting retry', async () => {
    const existing = session();
    const replayRepo = repository({
      findByClient: jest.fn().mockResolvedValue(existing),
    });
    const replay = await new ToeicListeningPracticeService(replayRepo).start(
      principal,
      {
        clientSessionId: 'client-1',
        listeningPart: ToeicPart.PART_1,
        questionCount: 1,
      },
    );
    expect(replay.replayed).toBe(true);

    await expect(
      new ToeicListeningPracticeService(replayRepo).start(principal, {
        clientSessionId: 'client-1',
        listeningPart: ToeicPart.PART_1,
        questionCount: 2,
      }),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.CONFLICT });
  });

  it('does not start when the eligible catalogue cannot satisfy the requested count', async () => {
    const repo = repository({
      eligibleQuestions: jest.fn().mockResolvedValue([]),
    });
    await expect(
      new ToeicListeningPracticeService(repo).start(principal, {
        clientSessionId: 'client-1',
        questionCount: 1,
      }),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.NOT_FOUND });
  });

  it('records an answer without returning correctness and makes retries immutable', async () => {
    const repo = repository({
      findSession: jest.fn().mockResolvedValue(session()),
    });
    const service = new ToeicListeningPracticeService(repo);
    const result = await service.answer(principal, 'session-1', {
      questionId: 'version-1',
      selectedOption: 'A',
    });
    expect(result).toMatchObject({
      accepted: true,
      replayed: false,
      answered: 1,
    });
    expect(JSON.stringify(result)).not.toContain('isCorrect');

    const prior = session({
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
    repo.findSession.mockResolvedValue(prior);
    await expect(
      service.answer(principal, 'session-1', {
        questionId: 'version-1',
        selectedOption: 'B',
      }),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.CONFLICT });

    const replay = await service.answer(principal, 'session-1', {
      questionId: 'version-1',
      selectedOption: 'A',
    });
    expect(replay).toMatchObject({ accepted: true, replayed: true });

    repo.findSession.mockResolvedValue(session());
    await expect(
      service.answer(principal, 'session-1', {
        questionId: 'version-1',
        selectedOption: 'C',
      }),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.INVALID_CONTENT });

    repo.privateQuestionsByIds.mockResolvedValue([
      { id: 'version-1', options: question.options, correctAnswer: 'A' },
    ]);
    repo.createAnswer.mockResolvedValue(false);
    await expect(
      service.answer(principal, 'session-1', {
        questionId: 'version-1',
        selectedOption: 'A',
      }),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.CONFLICT });
  });

  it('rejects unselected and cross-owner sessions without leaking ownership', async () => {
    const repo = repository({ findSession: jest.fn().mockResolvedValue(null) });
    const service = new ToeicListeningPracticeService(repo);
    await expect(
      service.answer(principal, 'other-session', {
        questionId: 'version-1',
        selectedOption: 'A',
      }),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.NOT_FOUND });
    expect(repo.findSession.mock.calls).toContainEqual([
      'other-session',
      'learner-1',
    ]);
  });

  it('recovers a concurrent start from the unique owner/client key and sanitizes repository failures', async () => {
    const replay = session();
    const repo = repository({
      createSession: jest.fn().mockRejectedValue({ code: 'P2002' }),
      findByClient: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(replay),
    });
    const result = await new ToeicListeningPracticeService(repo).start(
      principal,
      {
        clientSessionId: 'client-1',
        listeningPart: ToeicPart.PART_1,
        questionCount: 1,
      },
    );
    expect(result.replayed).toBe(true);

    const failing = repository({
      eligibleQuestions: jest
        .fn()
        .mockRejectedValue(new Error('database detail')),
    });
    await expect(
      new ToeicListeningPracticeService(failing).start(principal, {
        clientSessionId: 'client-1',
        questionCount: 1,
      }),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.REPOSITORY_FAILURE });
  });

  it('enforces completion and uses compare-and-set submission', async () => {
    const incompleteRepo = repository({
      findSession: jest.fn().mockResolvedValue(session()),
    });
    await expect(
      new ToeicListeningPracticeService(incompleteRepo).submit(
        principal,
        'session-1',
      ),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.INCOMPLETE });

    const completed = session({
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
    const submitted = session({
      status: 'SUBMITTED',
      score: 1,
      submittedAt: new Date(),
      answers: completed.answers,
    });
    const repo = repository({
      findSession: jest
        .fn()
        .mockResolvedValueOnce(completed)
        .mockResolvedValueOnce(submitted),
    });
    const result = await new ToeicListeningPracticeService(repo).submit(
      principal,
      'session-1',
    );
    expect(repo.submitSession.mock.calls).toContainEqual([
      'session-1',
      'learner-1',
      1,
      expect.any(Date),
    ]);
    expect(result).toMatchObject({ status: 'SUBMITTED', score: 1 });
  });

  it('returns active progress and repeats a finalized result without another submit', async () => {
    const activeRepo = repository({
      findSession: jest.fn().mockResolvedValue(session()),
    });
    const active = await new ToeicListeningPracticeService(activeRepo).result(
      principal,
      'session-1',
    );
    expect(active).toMatchObject({ status: 'ACTIVE', answered: 0 });
    expect(JSON.stringify(active)).not.toContain('isCorrect');

    const submitted = session({
      status: 'SUBMITTED',
      score: 1,
      submittedAt: new Date(),
    });
    const submittedRepo = repository({
      findSession: jest.fn().mockResolvedValue(submitted),
    });
    const service = new ToeicListeningPracticeService(submittedRepo);
    const first = await service.submit(principal, 'session-1');
    const second = await service.submit(principal, 'session-1');
    expect(first).toEqual(second);
    expect(submittedRepo.submitSession.mock.calls).toHaveLength(0);
    expect(JSON.stringify(first)).not.toContain('correctAnswer');
  });
});
