import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  ToeicQuestionRepository,
  SafeToeicQuestion,
} from './toeic-question.models';

@Injectable()
export class PrismaToeicQuestionRepository implements ToeicQuestionRepository {
  constructor(private readonly prisma: PrismaService) {}
  private where(input: any, now: Date) {
    return {
      AND: [
        {
          reviewStatus: 'REVIEWED' as const,
          publicationState: 'PUBLISHED' as const,
          licenseStatus: 'APPROVED' as const,
          publishedAt: { lte: now },
        },
        { OR: [{ validUntil: null }, { validUntil: { gt: now } }] },
      ],
      ...(input.part && { part: input.part }),
      ...(input.questionType && { questionType: input.questionType }),
      ...(input.difficulty && { difficulty: input.difficulty }),
      ...(input.topic && { topic: input.topic }),
      ...(input.stimulusGroup && { stimulusGroup: input.stimulusGroup }),
    };
  }
  private select = {
    id: true,
    questionId: true,
    version: true,
    part: true,
    questionType: true,
    difficulty: true,
    topic: true,
    stimulusGroup: true,
    prompt: true,
    options: true,
    mediaReference: true,
    explanation: true,
  } as const;
  async list(input: any) {
    const rows = await this.prisma.toeicQuestionVersion.findMany({
      where: this.where(input, input.now),
      orderBy: [{ questionId: 'asc' }, { version: 'desc' }],
      select: this.select,
    });
    const current = new Map<string, SafeToeicQuestion>();
    for (const row of rows)
      if (!current.has(row.questionId))
        current.set(row.questionId, row as SafeToeicQuestion);
    const all = [...current.values()];
    return {
      items: all.slice(input.skip, input.skip + input.take),
      totalItems: all.length,
    };
  }
  async find(id: string, now: Date) {
    return (await this.prisma.toeicQuestionVersion.findFirst({
      where: { id, ...this.where({}, now) },
      orderBy: { version: 'desc' },
      select: this.select,
    })) as SafeToeicQuestion | null;
  }
}
