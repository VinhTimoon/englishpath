import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  TOEIC_QUESTION_SAFE_SELECT,
  type SafeToeicQuestion,
  type ToeicQuestionListInput,
  type ToeicQuestionRepository,
} from './toeic-question.models';

@Injectable()
export class PrismaToeicQuestionRepository implements ToeicQuestionRepository {
  constructor(private readonly prisma: PrismaService) {}

  private eligibleWhere(now: Date): Prisma.ToeicQuestionVersionWhereInput {
    return {
      reviewStatus: 'REVIEWED',
      publicationState: 'PUBLISHED',
      licenseStatus: 'APPROVED',
      publishedAt: { lte: now },
      OR: [{ validUntil: null }, { validUntil: { gt: now } }],
    };
  }

  async list(input: ToeicQuestionListInput) {
    const rows = await this.prisma.toeicQuestionVersion.findMany({
      where: this.eligibleWhere(input.now),
      orderBy: [{ questionId: 'asc' }, { version: 'desc' }],
      select: TOEIC_QUESTION_SAFE_SELECT,
    });

    const current = new Map<string, SafeToeicQuestion>();
    for (const row of rows) {
      if (!current.has(row.questionId)) current.set(row.questionId, row);
    }

    const filtered = [...current.values()].filter((row) => {
      return (
        (!input.part || row.part === input.part) &&
        (!input.questionType || row.questionType === input.questionType) &&
        (!input.difficulty || row.difficulty === input.difficulty) &&
        (!input.topic || row.topic === input.topic) &&
        (!input.stimulusGroup || row.stimulusGroup === input.stimulusGroup)
      );
    });

    return {
      items: filtered.slice(input.skip, input.skip + input.take),
      totalItems: filtered.length,
    };
  }

  find(questionId: string, now: Date) {
    return this.prisma.toeicQuestionVersion.findFirst({
      where: { ...this.eligibleWhere(now), questionId },
      orderBy: { version: 'desc' },
      select: TOEIC_QUESTION_SAFE_SELECT,
    });
  }
}
