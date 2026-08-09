import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { LibraryCatalogueService } from './library-catalogue.service';
import type {
  LibraryProgressDto,
  LibraryBookmarkDto,
  LibraryNoteDto,
} from './library-learning.dto';
import {
  LIBRARY_LEARNING_REPOSITORY,
  type LibraryLearningRepositoryPort,
} from './library-learning.port';

const progressMap = {
  not_started: 'NOT_STARTED',
  in_progress: 'IN_PROGRESS',
  completed: 'COMPLETED',
  abandoned: 'ABANDONED',
} as const;

@Injectable()
export class LibraryLearningService {
  constructor(
    @Inject(LIBRARY_LEARNING_REPOSITORY)
    private readonly repository: LibraryLearningRepositoryPort,
    private readonly catalogue: LibraryCatalogueService,
  ) {}

  private async item(versionId: string) {
    const item = await this.catalogue.getItem(versionId);
    return { item, duration: item.durationSeconds };
  }

  private projectProgress(
    progress: {
      positionSeconds: number;
      status: string;
      version: number;
      updatedAt: Date;
    } | null,
  ) {
    return progress
      ? {
          positionSeconds: progress.positionSeconds,
          status: progress.status.toLowerCase(),
          version: progress.version,
          updatedAt: progress.updatedAt,
        }
      : null;
  }

  async state(userId: string, versionId: string) {
    const { item } = await this.item(versionId);
    const [progress, bookmarks, note] = await Promise.all([
      this.repository.findProgress(userId, versionId),
      this.repository.listBookmarks(userId, versionId),
      this.repository.findNote(userId, versionId),
    ]);
    return {
      item,
      progress: this.projectProgress(progress),
      bookmarks: bookmarks.map(({ timestampSeconds }) => ({
        timestampSeconds,
      })),
      note: note ? { body: note.body, updatedAt: note.updatedAt } : null,
    };
  }

  async saveProgress(
    userId: string,
    versionId: string,
    dto: LibraryProgressDto,
  ) {
    const { duration } = await this.item(versionId);
    const max = duration ?? 86400;
    if (dto.positionSeconds > max)
      throw new BadRequestException('Position exceeds duration');
    if (
      dto.status === 'completed' &&
      duration !== undefined &&
      dto.positionSeconds < duration
    ) {
      throw new BadRequestException('Completion requires end position');
    }
    const result = await this.repository.upsertProgress(userId, versionId, {
      positionSeconds: dto.positionSeconds,
      status: progressMap[dto.status as keyof typeof progressMap],
    });
    return this.projectProgress(result);
  }

  async addBookmark(
    userId: string,
    versionId: string,
    dto: LibraryBookmarkDto,
  ) {
    const { duration } = await this.item(versionId);
    if (dto.timestampSeconds > (duration ?? 86400))
      throw new BadRequestException('Bookmark exceeds duration');
    const result = await this.repository.upsertBookmark(
      userId,
      versionId,
      dto.timestampSeconds,
    );
    return { timestampSeconds: result.timestampSeconds };
  }

  async deleteBookmark(
    userId: string,
    versionId: string,
    timestampSeconds: number,
  ) {
    await this.item(versionId);
    await this.repository.deleteBookmark(userId, versionId, timestampSeconds);
    return { deleted: true };
  }

  async saveNote(userId: string, versionId: string, dto: LibraryNoteDto) {
    await this.item(versionId);
    if (
      [...dto.body].some((character) => {
        const code = character.charCodeAt(0);
        return (
          (code < 32 && code !== 9 && code !== 10 && code !== 13) ||
          code === 127
        );
      })
    )
      throw new BadRequestException('Note contains invalid control data');
    const result = await this.repository.upsertNote(
      userId,
      versionId,
      dto.body,
    );
    return { body: result.body, updatedAt: result.updatedAt };
  }

  async deleteNote(userId: string, versionId: string) {
    await this.item(versionId);
    await this.repository.deleteNote(userId, versionId);
    return { deleted: true };
  }
}
