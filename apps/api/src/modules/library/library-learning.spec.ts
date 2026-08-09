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
});
