import { createApplicationPrincipal } from '../access';
import {
  ToeicDifficulty,
  ToeicPart,
  ToeicQuestionType,
} from '../../generated/prisma/enums';
import { TOEIC_ERROR_CODES } from './toeic-question.error';
import type {
  ReadingQuestion,
  ReadingGradingSession,
  ReadingSession,
  ToeicReadingPracticeRepository,
} from './toeic-reading-practice.models';
import { ToeicReadingPracticeService } from './toeic-reading-practice.service';

const principal = createApplicationPrincipal({
  applicationUserId: 'reading-learner-1',
  externalIdentity: {
    provider: 'fixture',
    subject: 'reading-learner-1',
    issuer: 'issuer',
    audience: 'audience',
  },
  roles: ['FREE_USER'],
  ownerships: [],
  entitlements: [],
});

const question: ReadingQuestion = {
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
  explanation: 'A learner-safe explanation.',
};

function session(overrides: Partial<ReadingSession> = {}): ReadingSession {
  return {
    id: 'reading-session-1',
    userId: principal.applicationUserId,
    clientSessionId: 'reading-client-1',
    readingPart: ToeicPart.PART_5,
    questionIds: ['reading-version-1'],
    status: 'ACTIVE',
    total: 1,
    score: null,
    startedAt: new Date('2026-08-06T00:00:00.000Z'),
    submittedAt: null,
    answers: [],
    ...overrides,
  };
}

function gradingSession(
  overrides: Partial<ReadingGradingSession> = {},
): ReadingGradingSession {
  return {
    ...session(),
    ...overrides,
    answers: overrides.answers ?? [],
  };
}

function repository(
  overrides: Partial<jest.Mocked<ToeicReadingPracticeRepository>> = {},
) {
  return {
    eligibleQuestions: jest.fn().mockResolvedValue([question]),
    safeQuestionsByIds: jest.fn().mockResolvedValue([question]),
    snapshotQuestionsByIds: jest.fn().mockResolvedValue([question]),
    privateQuestionsByIds: jest
      .fn()
      .mockResolvedValue([
        { id: question.id, options: question.options, correctAnswer: 'A' },
      ]),
    findSession: jest.fn(),
    findGradingSession: jest.fn().mockResolvedValue(gradingSession()),
    findByClient: jest.fn().mockResolvedValue(null),
    createSession: jest.fn().mockResolvedValue(session()),
    createAnswer: jest.fn().mockResolvedValue(true),
    submitSession: jest.fn().mockResolvedValue(true),
    ...overrides,
  } as jest.Mocked<ToeicReadingPracticeRepository>;
}

describe('ToeicReadingPracticeService', () => {
  it('selects Parts 5-7 content and returns a safe projection', async () => {
    const repo = repository();
    const result = await new ToeicReadingPracticeService(repo).start(
      principal,
      {
        clientSessionId: 'reading-client-1',
        readingPart: ToeicPart.PART_5,
        questionCount: 1,
      },
    );

    expect(result).toMatchObject({ replayed: false });
    expect(result.questions[0]).toMatchObject({
      id: question.id,
      stimulusGroup: null,
    });
    expect(JSON.stringify(result)).not.toContain('correctAnswer');
    expect(repo.createSession.mock.calls).toContainEqual([
      expect.objectContaining({
        questionIds: [question.id],
        readingPart: ToeicPart.PART_5,
      }),
    ]);
  });

  it('replays exact starts and conflicts when the part or count changes', async () => {
    const repo = repository({
      findByClient: jest.fn().mockResolvedValue(session()),
    });
    const service = new ToeicReadingPracticeService(repo);
    const replay = await service.start(principal, {
      clientSessionId: 'reading-client-1',
      readingPart: ToeicPart.PART_5,
      questionCount: 1,
    });
    expect(replay.replayed).toBe(true);

    await expect(
      service.start(principal, {
        clientSessionId: 'reading-client-1',
        readingPart: ToeicPart.PART_6,
        questionCount: 1,
      }),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.CONFLICT });
  });

  it('recovers a unique-key start race and replays the immutable snapshot', async () => {
    const repo = repository({
      createSession: jest.fn().mockRejectedValue({ code: 'P2002' }),
      findByClient: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(session()),
    });
    const result = await new ToeicReadingPracticeService(repo).start(
      principal,
      {
        clientSessionId: 'reading-client-1',
        readingPart: ToeicPart.PART_5,
        questionCount: 1,
      },
    );
    expect(result.replayed).toBe(true);
    expect(repo.snapshotQuestionsByIds.mock.calls).toContainEqual([
      [question.id],
      expect.any(Date),
    ]);
  });

  it('sanitizes a repository failure while recovering a unique-key start race', async () => {
    const repo = repository({
      createSession: jest.fn().mockRejectedValue({ code: 'P2002' }),
      findByClient: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockRejectedValueOnce(new Error('race recovery database detail')),
    });
    await expect(
      new ToeicReadingPracticeService(repo).start(principal, {
        clientSessionId: 'reading-client-1',
        readingPart: ToeicPart.PART_5,
        questionCount: 1,
      }),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.REPOSITORY_FAILURE });
  });

  it('rejects an insufficient catalogue and sanitizes repository failures', async () => {
    const empty = repository({
      eligibleQuestions: jest.fn().mockResolvedValue([]),
    });
    await expect(
      new ToeicReadingPracticeService(empty).start(principal, {
        clientSessionId: 'reading-client-1',
        questionCount: 1,
      }),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.NOT_FOUND });

    const failing = repository({
      eligibleQuestions: jest
        .fn()
        .mockRejectedValue(new Error('database detail')),
    });
    await expect(
      new ToeicReadingPracticeService(failing).start(principal, {
        clientSessionId: 'reading-client-1',
        questionCount: 1,
      }),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.REPOSITORY_FAILURE });
  });

  it('keeps answers immutable and never returns correctness', async () => {
    const repo = repository({
      findSession: jest.fn().mockResolvedValue(session()),
    });
    const service = new ToeicReadingPracticeService(repo);
    const answer = await service.answer(principal, 'reading-session-1', {
      questionId: question.id,
      selectedOption: 'A',
    });
    expect(answer).toMatchObject({
      accepted: true,
      replayed: false,
      answered: 1,
    });
    expect(JSON.stringify(answer)).not.toContain('isCorrect');

    repo.findSession.mockResolvedValue(
      session({
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
    const replay = await service.answer(principal, 'reading-session-1', {
      questionId: question.id,
      selectedOption: 'A',
    });
    expect(replay).toMatchObject({ accepted: true, replayed: true });
    await expect(
      service.answer(principal, 'reading-session-1', {
        questionId: question.id,
        selectedOption: 'B',
      }),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.CONFLICT });

    repo.findSession.mockResolvedValue(session());
    await expect(
      service.answer(principal, 'reading-session-1', {
        questionId: 'not-selected',
        selectedOption: 'A',
      }),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.NOT_FOUND });
    await expect(
      service.answer(principal, 'reading-session-1', {
        questionId: question.id,
        selectedOption: 'C',
      }),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.INVALID_CONTENT });
  });

  it('fails closed before replaying an answer when the selected version expires', async () => {
    const repo = repository({
      findSession: jest.fn().mockResolvedValue(
        session({
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
      ),
      privateQuestionsByIds: jest.fn().mockResolvedValue([]),
    });

    await expect(
      new ToeicReadingPracticeService(repo).answer(
        principal,
        'reading-session-1',
        { questionId: question.id, selectedOption: 'A' },
      ),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.NOT_FOUND });
    expect(repo.privateQuestionsByIds.mock.calls).toContainEqual([
      [question.id],
      expect.any(Date),
    ]);
  });

  it('sanitizes a repository failure while recovering a duplicate answer race', async () => {
    const repo = repository({
      findSession: jest
        .fn()
        .mockResolvedValueOnce(session())
        .mockRejectedValueOnce(new Error('answer race database detail')),
      createAnswer: jest.fn().mockRejectedValue({ code: 'P2002' }),
    });
    await expect(
      new ToeicReadingPracticeService(repo).answer(
        principal,
        'reading-session-1',
        { questionId: question.id, selectedOption: 'A' },
      ),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.REPOSITORY_FAILURE });
  });

  it('enforces selected-question completeness and active-session locking', async () => {
    const repo = repository({
      findSession: jest.fn().mockResolvedValue(session()),
    });
    const service = new ToeicReadingPracticeService(repo);
    await expect(
      service.submit(principal, 'reading-session-1'),
    ).rejects.toMatchObject({
      code: TOEIC_ERROR_CODES.INCOMPLETE,
    });

    repo.findSession.mockResolvedValue(session());
    repo.privateQuestionsByIds.mockResolvedValue([
      { id: question.id, options: question.options, correctAnswer: 'A' },
    ]);
    repo.createAnswer.mockResolvedValue(false);
    await expect(
      service.answer(principal, 'reading-session-1', {
        questionId: question.id,
        selectedOption: 'A',
      }),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.CONFLICT });
  });

  it('returns active progress and a repeated safe final result', async () => {
    const activeRepo = repository({
      findSession: jest.fn().mockResolvedValue(session()),
    });
    const active = await new ToeicReadingPracticeService(activeRepo).result(
      principal,
      'reading-session-1',
    );
    expect(active).toMatchObject({ status: 'ACTIVE', answered: 0 });

    const submitted = session({
      status: 'SUBMITTED',
      score: 1,
      submittedAt: new Date(),
    });
    const submittedRepo = repository({
      findSession: jest.fn().mockResolvedValue(submitted),
      findGradingSession: jest.fn().mockResolvedValue(
        gradingSession({
          status: 'SUBMITTED',
          score: 1,
          submittedAt: submitted.submittedAt,
        }),
      ),
    });
    const service = new ToeicReadingPracticeService(submittedRepo);
    const first = await service.submit(principal, 'reading-session-1');
    const second = await service.submit(principal, 'reading-session-1');
    expect(first).toEqual(second);
    expect(submittedRepo.submitSession.mock.calls).toHaveLength(0);
    expect(JSON.stringify(first)).not.toContain('correctAnswer');
  });

  it('does not reveal cross-owner sessions and maps answer, submit, and result failures', async () => {
    const missing = repository({
      findSession: jest.fn().mockResolvedValue(null),
      findGradingSession: jest.fn().mockResolvedValue(null),
    });
    const missingService = new ToeicReadingPracticeService(missing);
    await expect(
      missingService.answer(principal, 'other-session', {
        questionId: question.id,
        selectedOption: 'A',
      }),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.NOT_FOUND });
    await expect(
      missingService.submit(principal, 'other-session'),
    ).rejects.toMatchObject({
      code: TOEIC_ERROR_CODES.NOT_FOUND,
    });
    await expect(
      missingService.result(principal, 'other-session'),
    ).rejects.toMatchObject({
      code: TOEIC_ERROR_CODES.NOT_FOUND,
    });

    const answerFailure = repository({
      findSession: jest.fn().mockResolvedValue(session()),
      privateQuestionsByIds: jest
        .fn()
        .mockRejectedValue(new Error('answer db detail')),
    });
    await expect(
      new ToeicReadingPracticeService(answerFailure).answer(
        principal,
        'reading-session-1',
        {
          questionId: question.id,
          selectedOption: 'A',
        },
      ),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.REPOSITORY_FAILURE });

    const submitFailure = repository({
      findGradingSession: jest.fn().mockResolvedValue(
        gradingSession({
          answers: [
            {
              id: 'answer-1',
              sessionId: 'reading-session-1',
              questionId: question.id,
              selectedOption: 'A',
              isCorrect: true,
              answeredAt: new Date(),
            },
          ],
        }),
      ),
      submitSession: jest.fn().mockRejectedValue(new Error('submit db detail')),
    });
    await expect(
      new ToeicReadingPracticeService(submitFailure).submit(
        principal,
        'reading-session-1',
      ),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.REPOSITORY_FAILURE });

    const resultFailure = repository({
      findSession: jest.fn().mockRejectedValue(new Error('result db detail')),
    });
    await expect(
      new ToeicReadingPracticeService(resultFailure).result(
        principal,
        'reading-session-1',
      ),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.REPOSITORY_FAILURE });
  });
});
