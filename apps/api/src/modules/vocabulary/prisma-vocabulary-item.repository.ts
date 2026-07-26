import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  PublishedVocabularyItem,
  VocabularyItemRepository,
} from './vocabulary.models';

@Injectable()
export class PrismaVocabularyItemRepository implements VocabularyItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listPublished(
    input: Readonly<{
      taxonomyNodeId: string;
      now: Date;
      skip: number;
      take: number;
    }>,
  ): Promise<readonly PublishedVocabularyItem[]> {
    return this.prisma.governedVocabularyItem.findMany({
      where: {
        taxonomyNodeId: input.taxonomyNodeId,
        reviewStatus: 'REVIEWED',
        publishStatus: 'PUBLISHED',
        publishedAt: { lte: input.now },
      },
      orderBy: [{ word: 'asc' }, { id: 'asc' }],
      skip: input.skip,
      take: input.take,
      select: {
        id: true,
        taxonomyNodeId: true,
        word: true,
        meaning: true,
        example: true,
        pronunciation: true,
      },
    });
  }

  countPublished(
    input: Readonly<{
      taxonomyNodeId: string;
      now: Date;
    }>,
  ): Promise<number> {
    return this.prisma.governedVocabularyItem.count({
      where: {
        taxonomyNodeId: input.taxonomyNodeId,
        reviewStatus: 'REVIEWED',
        publishStatus: 'PUBLISHED',
        publishedAt: { lte: input.now },
      },
    });
  }
}
