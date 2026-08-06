import { Inject, Injectable } from '@nestjs/common';
import {
  TOEIC_QUESTION_REPOSITORY,
  type ToeicQuestionRepository,
} from './toeic-question.models';
import { TOEIC_ERROR_CODES, ToeicQuestionError } from './toeic-question.error';
import type { ToeicQuestionQueryDto } from './dto/toeic-question-query.dto';

@Injectable()
export class ToeicQuestionService {
  constructor(
    @Inject(TOEIC_QUESTION_REPOSITORY)
    private readonly repository: ToeicQuestionRepository,
  ) {}

  async list(query: ToeicQuestionQueryDto) {
    try {
      const result = await this.repository.list({
        ...query,
        skip: (query.page - 1) * query.size,
        take: query.size,
        now: new Date(),
      });
      return {
        data: result.items,
        page: {
          number: query.page,
          size: query.size,
          totalItems: result.totalItems,
          totalPages: Math.ceil(result.totalItems / query.size),
        },
      };
    } catch {
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.REPOSITORY_FAILURE);
    }
  }

  async get(questionId: string) {
    try {
      const item = await this.repository.find(questionId, new Date());
      if (!item) {
        throw new ToeicQuestionError(TOEIC_ERROR_CODES.NOT_FOUND);
      }
      return { data: item };
    } catch (error) {
      if (error instanceof ToeicQuestionError) throw error;
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.REPOSITORY_FAILURE);
    }
  }
}
