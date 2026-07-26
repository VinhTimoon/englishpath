import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { CompletionRecord, SentenceRecord } from './daily-sentence.models';
import type { DailySentenceRepository } from './daily-sentence.ports';

@Injectable()
export class PrismaDailySentenceRepository implements DailySentenceRepository {
  constructor(private readonly prisma: PrismaService) {}
  async profileTimezone(userId: string) {
    return (
      (
        await this.prisma.userProfile.findUnique({
          where: { userId },
          select: { timezone: true },
        })
      )?.timezone ?? null
    );
  }
  async eligibleSentences(now = new Date()): Promise<SentenceRecord[]> {
    return this.prisma.governedSentence.findMany({
      where: {
        reviewStatus: 'REVIEWED',
        publishStatus: 'PUBLISHED',
        publishedAt: { lte: now },
      },
      orderBy: { id: 'asc' },
      select: { id: true, prompt: true, expectedAnswer: true },
    });
  }
  async completion(
    userId: string,
    localDate: Date,
  ): Promise<CompletionRecord | null> {
    return this.prisma.dailySentenceCompletion.findUnique({
      where: { userId_localDate: { userId, localDate } },
      select: {
        sentence: { select: { id: true, prompt: true, expectedAnswer: true } },
        submittedAnswer: true,
        isCorrect: true,
        feedback: true,
        completedAt: true,
      },
    });
  }
  async complete(
    userId: string,
    sentenceId: string,
    localDate: Date,
    answer: string,
    isCorrect: boolean,
    feedback: string,
  ) {
    try {
      return await this.prisma.dailySentenceCompletion.create({
        data: {
          userId,
          sentenceId,
          localDate,
          submittedAnswer: answer,
          isCorrect,
          feedback,
        },
        select: {
          sentence: {
            select: { id: true, prompt: true, expectedAnswer: true },
          },
          submittedAnswer: true,
          isCorrect: true,
          feedback: true,
          completedAt: true,
        },
      });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        const winner = await this.completion(userId, localDate);
        if (winner) return winner;
      }
      throw error;
    }
  }
}
