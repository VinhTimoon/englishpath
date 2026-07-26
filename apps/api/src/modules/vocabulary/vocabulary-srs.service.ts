import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import type { ApplicationPrincipal } from '../access';
import { VOCABULARY_SRS_REPOSITORY } from './vocabulary.models';
import type { VocabularySrsRepositoryPort } from './vocabulary-srs.repository';

const intervals = [0, 1, 3, 7, 14, 30];

@Injectable()
export class VocabularySrsService {
  constructor(
    @Inject(VOCABULARY_SRS_REPOSITORY)
    private readonly repository: VocabularySrsRepositoryPort,
  ) {}

  due(principal: ApplicationPrincipal, limit: number) {
    return this.repository.listDue(
      principal.applicationUserId,
      new Date(),
      limit,
    );
  }

  async review(
    principal: ApplicationPrincipal,
    vocabularyId: string,
    quality: number,
    clientSubmissionId: string,
  ) {
    const item = await this.repository.findPublished(vocabularyId, new Date());
    if (!item) throw new NotFoundException('Vocabulary item not found');
    const prior = await this.repository.findState(
      principal.applicationUserId,
      vocabularyId,
    );
    const repetitions =
      quality < 2
        ? 0
        : Math.min((prior?.repetitions ?? 0) + 1, intervals.length - 1);
    const intervalDays = quality < 2 ? 0 : intervals[repetitions];
    const nextReviewAt = new Date(
      Date.now() + (quality < 2 ? 600000 : intervalDays * 86400000),
    );
    const mastery =
      quality < 2
        ? Math.max(0, (prior?.mastery ?? 0) - 10)
        : Math.min(100, (prior?.mastery ?? 0) + 20 + quality * 5);
    const response = {
      ...item,
      mastery,
      repetitions,
      intervalDays,
      nextReviewAt,
    };
    const result = await this.repository.review({
      userId: principal.applicationUserId,
      vocabularyId,
      clientSubmissionId,
      quality,
      result: response,
      next: { mastery, repetitions, intervalDays, nextReviewAt },
    });
    if (result.replayed) {
      if (result.existing.quality !== quality)
        throw new ConflictException(
          'Submission identifier was already used with different review quality',
        );
      return {
        data: result.existing.result,
        idempotencyStatus: 'replayed' as const,
      };
    }
    return { data: response, idempotencyStatus: 'created' as const };
  }
}
