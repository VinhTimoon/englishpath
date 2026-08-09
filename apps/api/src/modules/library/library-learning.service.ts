import {
  BadRequestException,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';
import { LibraryCatalogueService } from './library-catalogue.service';
import {
  LIBRARY_DRILL_PORT,
  type LibraryDrillPort,
} from './library-drill.port';
import type { LibraryDrillAnswerDto } from './library-drill.dto';
import type {
  LibraryProgressDto,
  LibraryBookmarkDto,
  LibraryNoteDto,
  ShadowingProgressDto,
  ShadowingFinalizeDto,
} from './library-learning.dto';
import {
  LIBRARY_LEARNING_REPOSITORY,
  type LibraryDrillOutcomeRecord,
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
    @Optional()
    @Inject(LIBRARY_DRILL_PORT)
    private readonly drills: LibraryDrillPort = {
      find: () => Promise.resolve(null),
    },
  ) {}

  async getDrill(_userId: string, versionId: string) {
    await this.item(versionId);
    const drill = await this.drills.find(versionId);
    if (!drill || drill.versionId !== versionId) return null;
    const publicDrill = { ...drill };
    delete (publicDrill as { correctOptionId?: string }).correctOptionId;
    return publicDrill;
  }

  async submitDrill(
    userId: string,
    versionId: string,
    dto: LibraryDrillAnswerDto,
  ) {
    await this.item(versionId);
    const drill = await this.drills.find(versionId);
    if (
      !drill ||
      drill.versionId !== versionId ||
      drill.questionId !== dto.questionId
    )
      throw new BadRequestException('Invalid drill question');
    if (!drill.options.some((option) => option.id === dto.selectedOptionId))
      throw new BadRequestException('Invalid drill option');
    const existing = await this.repository.findDrillOutcome?.(
      userId,
      versionId,
      drill.drillId,
      drill.questionId,
    );
    if (existing)
      return {
        questionId: existing.questionId,
        selectedOptionId: existing.selectedOptionId,
        isCorrect: existing.isCorrect,
        score: existing.score,
        completedAt: existing.completedAt,
      };
    const correct = dto.selectedOptionId === drill.correctOptionId;
    if (!this.repository.createDrillOutcome)
      throw new BadRequestException('Drill outcomes unavailable');
    let result: LibraryDrillOutcomeRecord;
    try {
      result = await this.repository.createDrillOutcome({
        userId,
        contentVersionId: versionId,
        drillId: drill.drillId,
        questionId: drill.questionId,
        selectedOptionId: dto.selectedOptionId,
        isCorrect: correct,
        score: correct ? 1 : 0,
      });
    } catch (error) {
      const replay = await this.repository.findDrillOutcome?.(
        userId,
        versionId,
        drill.drillId,
        drill.questionId,
      );
      if (replay)
        return {
          questionId: replay.questionId,
          selectedOptionId: replay.selectedOptionId,
          isCorrect: replay.isCorrect,
          score: replay.score,
          completedAt: replay.completedAt,
        };
      throw error;
    }
    return {
      questionId: result.questionId,
      selectedOptionId: result.selectedOptionId,
      isCorrect: result.isCorrect,
      score: result.score,
      completedAt: result.completedAt,
    };
  }

  async drillHistory(userId: string, versionId: string) {
    await this.item(versionId);
    const outcomes = this.repository.listDrillOutcomes
      ? await this.repository.listDrillOutcomes(userId, versionId)
      : [];
    return outcomes.map(({ questionId, isCorrect, score, completedAt }) => ({
      questionId,
      isCorrect,
      score,
      completedAt,
    }));
  }

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

  async shadowing(userId: string, versionId: string) {
    const item = await this.catalogue.getItem(versionId);
    const [attempt, history] = await Promise.all([this.repository.findShadowingAttempt?.(userId, versionId), this.repository.listShadowingAttempts?.(userId, versionId)]);
    return { item, attempt: attempt ? this.shadowingProjection(attempt) : null, history: (history ?? []).map((entry) => this.shadowingProjection(entry)) };
  }

  async saveShadowing(userId: string, versionId: string, dto: ShadowingProgressDto) {
    const item = await this.catalogue.getItem(versionId);
    if (dto.segmentIndex >= item.transcript.length) throw new BadRequestException('Invalid shadowing segment');
    if (item.durationSeconds !== undefined && dto.positionSeconds > item.durationSeconds) throw new BadRequestException('Invalid shadowing position');
    if (!this.repository.upsertShadowingAttempt) throw new BadRequestException('Shadowing unavailable');
    return this.shadowingProjection(await this.repository.upsertShadowingAttempt(userId, versionId, { segmentIndex: dto.segmentIndex, positionSeconds: dto.positionSeconds, status: dto.status.toUpperCase() as 'ACTIVE' | 'PAUSED', ...(dto.selfRating === undefined ? {} : { selfRating: dto.selfRating }) }));
  }

  async finalizeShadowing(userId: string, versionId: string, dto: ShadowingFinalizeDto) {
    const item = await this.catalogue.getItem(versionId);
    if (dto.segmentIndex >= item.transcript.length) throw new BadRequestException('Invalid shadowing segment');
    if (item.durationSeconds !== undefined && dto.positionSeconds > item.durationSeconds) throw new BadRequestException('Invalid shadowing position');
    if (!this.repository.finalizeShadowingAttempt) throw new BadRequestException('Shadowing unavailable');
    return this.shadowingProjection(await this.repository.finalizeShadowingAttempt(userId, versionId, dto));
  }

  private shadowingProjection(entry: { attemptKey: string; segmentIndex: number; positionSeconds: number; status: string; selfRating: number | null; createdAt: Date; updatedAt: Date; finalizedAt: Date | null }) {
    return { attemptKey: entry.attemptKey, segmentIndex: entry.segmentIndex, positionSeconds: entry.positionSeconds, status: entry.status.toLowerCase(), selfRating: entry.selfRating, createdAt: entry.createdAt, updatedAt: entry.updatedAt, finalizedAt: entry.finalizedAt };
  }
}
