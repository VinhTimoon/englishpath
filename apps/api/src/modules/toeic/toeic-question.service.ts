import {
  Inject,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  TOEIC_QUESTION_REPOSITORY,
  type ToeicQuestionRepository,
} from './toeic-question.models';
import type { ToeicQuestionQueryDto } from './dto/toeic-question-query.dto';
@Injectable()
export class ToeicQuestionService {
  constructor(
    @Inject(TOEIC_QUESTION_REPOSITORY)
    private readonly repo: ToeicQuestionRepository,
  ) {}
  async list(query: ToeicQuestionQueryDto) {
    const now = new Date();
    try {
      const r = await this.repo.list({
        ...query,
        skip: (query.page - 1) * query.size,
        take: query.size,
        now,
      });
      return {
        data: r.items,
        page: {
          number: query.page,
          size: query.size,
          totalItems: r.totalItems,
          totalPages: Math.ceil(r.totalItems / query.size),
        },
      };
    } catch {
      throw new InternalServerErrorException(
        'TOEIC questions are unavailable.',
      );
    }
  }
  async get(id: string) {
    try {
      const item = await this.repo.find(id, new Date());
      if (!item) throw new NotFoundException('TOEIC question was not found.');
      return { data: item };
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      throw new InternalServerErrorException('TOEIC question is unavailable.');
    }
  }
}
