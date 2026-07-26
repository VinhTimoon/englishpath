import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type DueReview = Readonly<{
  vocabularyId: string;
  word: string;
  meaning: string;
  example: string | null;
  pronunciation: string | null;
  mastery: number;
  repetitions: number;
  intervalDays: number;
  nextReviewAt: Date;
}>;

export interface VocabularySrsRepositoryPort {
  listDue(userId: string, now: Date, limit: number): Promise<DueReview[]>;
  findPublished(
    vocabularyId: string,
    now: Date,
  ): Promise<{
    id: string;
    word: string;
    meaning: string;
    example: string | null;
    pronunciation: string | null;
  } | null>;
  findState(
    userId: string,
    vocabularyId: string,
  ): Promise<{ mastery: number; repetitions: number } | null>;
  review(input: {
    userId: string;
    vocabularyId: string;
    clientSubmissionId: string;
    quality: number;
    result: import('../../generated/prisma/client').Prisma.InputJsonValue;
    next: {
      mastery: number;
      repetitions: number;
      intervalDays: number;
      nextReviewAt: Date;
    };
  }): Promise<{
    replayed: boolean;
    existing: { quality: number; result: unknown };
  }>;
}

@Injectable()
export class VocabularySrsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listDue(
    userId: string,
    now: Date,
    limit: number,
  ): Promise<DueReview[]> {
    const rows = await this.prisma.vocabularyMasteryState.findMany({
      where: {
        userId,
        nextReviewAt: { lte: now },
        vocabulary: {
          reviewStatus: 'REVIEWED',
          publishStatus: 'PUBLISHED',
          publishedAt: { lte: now },
        },
      },
      orderBy: [{ nextReviewAt: 'asc' }, { vocabularyId: 'asc' }],
      take: limit,
      select: {
        vocabularyId: true,
        mastery: true,
        repetitions: true,
        intervalDays: true,
        nextReviewAt: true,
        vocabulary: {
          select: {
            word: true,
            meaning: true,
            example: true,
            pronunciation: true,
          },
        },
      },
    });
    return rows.map((row) => ({
      vocabularyId: row.vocabularyId,
      ...row.vocabulary,
      mastery: row.mastery,
      repetitions: row.repetitions,
      intervalDays: row.intervalDays,
      nextReviewAt: row.nextReviewAt,
    }));
  }

  findPublished(vocabularyId: string, now: Date) {
    return this.prisma.governedVocabularyItem.findFirst({
      where: {
        id: vocabularyId,
        reviewStatus: 'REVIEWED',
        publishStatus: 'PUBLISHED',
        publishedAt: { lte: now },
      },
      select: {
        id: true,
        word: true,
        meaning: true,
        example: true,
        pronunciation: true,
      },
    });
  }

  findState(userId: string, vocabularyId: string) {
    return this.prisma.vocabularyMasteryState.findUnique({
      where: { userId_vocabularyId: { userId, vocabularyId } },
      select: { mastery: true, repetitions: true },
    });
  }

  async review(input: {
    userId: string;
    vocabularyId: string;
    clientSubmissionId: string;
    quality: number;
    result: Prisma.InputJsonValue;
    next: {
      mastery: number;
      repetitions: number;
      intervalDays: number;
      nextReviewAt: Date;
    };
  }) {
    const key = {
      userId_vocabularyId_clientSubmissionId: {
        userId: input.userId,
        vocabularyId: input.vocabularyId,
        clientSubmissionId: input.clientSubmissionId,
      },
    };
    const existing = await this.prisma.vocabularyReviewSubmission.findUnique({
      where: key,
      select: { quality: true, result: true },
    });
    if (existing) return { existing, replayed: true } as const;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const state = await tx.vocabularyMasteryState.upsert({
          where: {
            userId_vocabularyId: {
              userId: input.userId,
              vocabularyId: input.vocabularyId,
            },
          },
          create: {
            userId: input.userId,
            vocabularyId: input.vocabularyId,
            ...input.next,
            lastReviewedAt: new Date(),
          },
          update: { ...input.next, lastReviewedAt: new Date() },
        });
        const submission = await tx.vocabularyReviewSubmission.create({
          data: {
            userId: input.userId,
            vocabularyId: input.vocabularyId,
            clientSubmissionId: input.clientSubmissionId,
            quality: input.quality,
            result: input.result,
          },
        });
        return {
          existing: { quality: submission.quality, result: submission.result },
          state,
          replayed: false,
        } as const;
      });
    } catch (error) {
      const errorCode =
        typeof error === 'object' && error !== null && 'code' in error
          ? (error as { code?: unknown }).code
          : undefined;
      if (errorCode === 'P2002') {
        const replay = await this.prisma.vocabularyReviewSubmission.findUnique({
          where: key,
          select: { quality: true, result: true },
        });
        if (replay) return { existing: replay, replayed: true } as const;
      }
      throw error;
    }
  }
}
