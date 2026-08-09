import { BadRequestException } from '@nestjs/common';
import { LibraryLearningService } from './library-learning.service';

const item = {
  versionId: 'version-1',
  itemId: 'content-1',
  title: 'Lesson',
  summary: 'Summary',
  taxonomy: { level: 'B1', topic: 'Workplace', relatedSkills: ['Listening'] },
  durationSeconds: 60,
  transcript: [],
  media: { state: 'PENDING' as const },
};

describe('LibraryLearningService', () => {
  const catalogue = { getItem: jest.fn() };
  const repository = {
    findProgress: jest.fn(),
    listBookmarks: jest.fn(),
    findNote: jest.fn(),
    upsertProgress: jest.fn(),
    upsertBookmark: jest.fn(),
    deleteBookmark: jest.fn(),
    upsertNote: jest.fn(),
    deleteNote: jest.fn(),
    findDrillOutcome: jest.fn(),
    createDrillOutcome: jest.fn(),
    listDrillOutcomes: jest.fn(),
    findShadowingAttempt: jest.fn(),
    listShadowingAttempts: jest.fn(),
    upsertShadowingAttempt: jest.fn(),
    finalizeShadowingAttempt: jest.fn(),
  };
  let service: LibraryLearningService;

  beforeEach(() => {
    jest.clearAllMocks();
    catalogue.getItem.mockResolvedValue(item);
    repository.findProgress.mockResolvedValue(null);
    repository.listBookmarks.mockResolvedValue([]);
    repository.findNote.mockResolvedValue(null);
    repository.deleteBookmark.mockResolvedValue({ count: 1 });
    repository.deleteNote.mockResolvedValue({ count: 1 });
    repository.findDrillOutcome.mockResolvedValue(null);
    repository.listDrillOutcomes.mockResolvedValue([]);
    repository.findShadowingAttempt.mockResolvedValue(null);
    repository.listShadowingAttempts.mockResolvedValue([]);
    service = new LibraryLearningService(repository, catalogue as never);
  });

  it('returns only owner-scoped learner state and safe bookmark projection', async () => {
    repository.findProgress.mockResolvedValue({
      positionSeconds: 12,
      status: 'IN_PROGRESS',
      version: 2,
      updatedAt: new Date('2026-01-01'),
    });
    repository.listBookmarks.mockResolvedValue([
      { id: 'private-id', userId: 'learner-1', timestampSeconds: 12 },
    ]);
    repository.findNote.mockResolvedValue({
      body: 'private note',
      updatedAt: new Date('2026-01-01'),
    });

    const result = await service.state('learner-1', 'version-1');

    expect(repository.findProgress).toHaveBeenCalledWith(
      'learner-1',
      'version-1',
    );
    expect(result).toMatchObject({
      progress: { positionSeconds: 12, status: 'in_progress', version: 2 },
      bookmarks: [{ timestampSeconds: 12 }],
      note: { body: 'private note' },
    });
    expect(JSON.stringify(result)).not.toContain('private-id');
    expect(JSON.stringify(result)).not.toContain('userId');
  });

  it('bounds progress and completion against the authoritative duration', async () => {
    await expect(
      service.saveProgress('learner-1', 'version-1', {
        status: 'in_progress',
        positionSeconds: 61,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.saveProgress('learner-1', 'version-1', {
        status: 'completed',
        positionSeconds: 59,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    repository.upsertProgress.mockResolvedValue({
      positionSeconds: 60,
      status: 'COMPLETED',
      version: 1,
      updatedAt: new Date('2026-01-01'),
    });
    await expect(
      service.saveProgress('learner-1', 'version-1', {
        status: 'completed',
        positionSeconds: 60,
      }),
    ).resolves.toMatchObject({ status: 'completed', positionSeconds: 60 });
  });

  it('uses idempotent owner-scoped writes for bookmarks and notes', async () => {
    repository.upsertBookmark.mockResolvedValue({ timestampSeconds: 12 });
    repository.upsertNote.mockResolvedValue({
      body: 'hello',
      updatedAt: new Date('2026-01-01'),
    });

    await service.addBookmark('learner-1', 'version-1', {
      timestampSeconds: 12,
    });
    await service.saveNote('learner-1', 'version-1', { body: 'hello' });

    expect(repository.upsertBookmark).toHaveBeenCalledWith(
      'learner-1',
      'version-1',
      12,
    );
    expect(repository.upsertNote).toHaveBeenCalledWith(
      'learner-1',
      'version-1',
      'hello',
    );
  });

  it('rejects unsafe note control data without persisting it', async () => {
    await expect(
      service.saveNote('learner-1', 'version-1', { body: 'bad\u0000note' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.upsertNote).not.toHaveBeenCalled();
  });

  it('redacts the drill answer and persists an immutable owner outcome', async () => {
    const drills = {
      find: jest.fn().mockResolvedValue({
        drillId: 'drill-1',
        versionId: 'version-1',
        questionId: 'question-1',
        prompt: 'Choose one',
        options: [
          { id: 'option-a', label: 'A' },
          { id: 'option-b', label: 'B' },
        ],
        correctOptionId: 'option-a',
      }),
    };
    repository.createDrillOutcome.mockResolvedValue({
      questionId: 'question-1',
      selectedOptionId: 'option-a',
      isCorrect: true,
      score: 1,
      completedAt: new Date('2026-01-01'),
    });
    const drillService = new LibraryLearningService(
      repository,
      catalogue as never,
      drills,
    );

    const projection = await drillService.getDrill('learner-1', 'version-1');
    expect(projection).not.toHaveProperty('correctOptionId');
    const result = await drillService.submitDrill('learner-1', 'version-1', {
      questionId: 'question-1',
      selectedOptionId: 'option-a',
    });
    expect(result).toMatchObject({ isCorrect: true, score: 1 });
    expect(repository.createDrillOutcome).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'learner-1',
        contentVersionId: 'version-1',
        selectedOptionId: 'option-a',
      }),
    );
  });

  it('rejects an option that is not in the server drill projection', async () => {
    const drills = {
      find: jest.fn().mockResolvedValue({
        drillId: 'drill-1',
        versionId: 'version-1',
        questionId: 'question-1',
        prompt: 'Choose one',
        options: [{ id: 'option-a', label: 'A' }],
        correctOptionId: 'option-a',
      }),
    };
    const drillService = new LibraryLearningService(
      repository,
      catalogue as never,
      drills,
    );
    await expect(
      drillService.submitDrill('learner-1', 'version-1', {
        questionId: 'question-1',
        selectedOptionId: 'option-b',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.createDrillOutcome).not.toHaveBeenCalled();
  });

  it('keeps shadowing progress owner-scoped, bounded, and redacted', async () => {
    const attempt = {
      attemptKey: 'attempt-1',
      segmentIndex: 0,
      positionSeconds: 4,
      status: 'PAUSED',
      selfRating: 4,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      finalizedAt: null,
      userId: 'private-user',
      contentVersionId: 'version-1',
    };
    catalogue.getItem.mockResolvedValue({
      ...item,
      transcript: [{ startSeconds: 0, endSeconds: 10, text: 'Repeat me' }],
    });
    repository.upsertShadowingAttempt.mockResolvedValue(attempt);
    const result = await service.saveShadowing('learner-1', 'version-1', {
      segmentIndex: 0,
      positionSeconds: 4,
      status: 'paused',
      selfRating: 4,
    });

    expect(repository.upsertShadowingAttempt).toHaveBeenCalledWith(
      'learner-1',
      'version-1',
      expect.objectContaining({ status: 'PAUSED', positionSeconds: 4 }),
    );
    expect(result).not.toHaveProperty('userId');
    expect(result).not.toHaveProperty('contentVersionId');
    await expect(
      service.saveShadowing('learner-1', 'version-1', {
        segmentIndex: 1,
        positionSeconds: 4,
        status: 'active',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('replays a finalized shadowing attempt without mutating it', async () => {
    const finalized = {
      attemptKey: 'attempt-1',
      segmentIndex: 0,
      positionSeconds: 10,
      status: 'FINALIZED',
      selfRating: 5,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      finalizedAt: new Date('2026-01-01T00:01:00Z'),
    };
    catalogue.getItem.mockResolvedValue({
      ...item,
      transcript: [{ startSeconds: 0, endSeconds: 10, text: 'Repeat me' }],
    });
    repository.finalizeShadowingAttempt.mockResolvedValue(finalized);
    const result = await service.finalizeShadowing('learner-1', 'version-1', {
      segmentIndex: 0,
      positionSeconds: 10,
      selfRating: 5,
    });

    expect(result).toMatchObject({ status: 'finalized', selfRating: 5 });
    expect(result.finalizedAt).toEqual(finalized.finalizedAt);
    expect(repository.finalizeShadowingAttempt).toHaveBeenCalledWith(
      'learner-1',
      'version-1',
      expect.objectContaining({ selfRating: 5 }),
    );
  });
});
