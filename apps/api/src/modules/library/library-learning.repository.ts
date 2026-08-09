import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { LibraryLearningRepositoryPort } from './library-learning.port';
import type { CreateLibraryDrillOutcome } from './library-learning.port';

@Injectable()
export class LibraryLearningRepository implements LibraryLearningRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  findProgress(userId: string, contentVersionId: string) {
    return this.prisma.libraryLearningProgress.findUnique({
      where: { userId_contentVersionId: { userId, contentVersionId } },
    });
  }

  listBookmarks(userId: string, contentVersionId: string) {
    return this.prisma.libraryBookmark.findMany({
      where: { userId, contentVersionId },
      orderBy: [{ timestampSeconds: 'asc' }, { id: 'asc' }],
    });
  }

  findNote(userId: string, contentVersionId: string) {
    return this.prisma.libraryPersonalNote.findUnique({
      where: { userId_contentVersionId: { userId, contentVersionId } },
    });
  }

  upsertProgress(
    userId: string,
    contentVersionId: string,
    data: {
      status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
      positionSeconds: number;
    },
  ) {
    return this.findProgress(userId, contentVersionId).then((existing) => {
      if (
        existing &&
        existing.status === data.status &&
        existing.positionSeconds === data.positionSeconds
      ) {
        return existing;
      }
      return this.prisma.libraryLearningProgress.upsert({
        where: { userId_contentVersionId: { userId, contentVersionId } },
        create: { userId, contentVersionId, ...data },
        update: { ...data, version: { increment: 1 } },
      });
    });
  }

  upsertBookmark(
    userId: string,
    contentVersionId: string,
    timestampSeconds: number,
  ) {
    return this.prisma.libraryBookmark.upsert({
      where: {
        userId_contentVersionId_timestampSeconds: {
          userId,
          contentVersionId,
          timestampSeconds,
        },
      },
      create: { userId, contentVersionId, timestampSeconds },
      update: {},
    });
  }

  deleteBookmark(
    userId: string,
    contentVersionId: string,
    timestampSeconds: number,
  ) {
    return this.prisma.libraryBookmark.deleteMany({
      where: { userId, contentVersionId, timestampSeconds },
    });
  }

  upsertNote(userId: string, contentVersionId: string, body: string) {
    return this.prisma.libraryPersonalNote.upsert({
      where: { userId_contentVersionId: { userId, contentVersionId } },
      create: { userId, contentVersionId, body },
      update: { body },
    });
  }

  deleteNote(userId: string, contentVersionId: string) {
    return this.prisma.libraryPersonalNote.deleteMany({
      where: { userId, contentVersionId },
    });
  }
  findDrillOutcome(
    userId: string,
    contentVersionId: string,
    drillId: string,
    questionId: string,
  ) {
    return this.prisma.libraryDrillOutcome.findUnique({
      where: {
        userId_contentVersionId_drillId_questionId: {
          userId,
          contentVersionId,
          drillId,
          questionId,
        },
      },
    });
  }
  createDrillOutcome(data: CreateLibraryDrillOutcome) {
    return this.prisma.libraryDrillOutcome.create({ data });
  }
  listDrillOutcomes(userId: string, contentVersionId: string) {
    return this.prisma.libraryDrillOutcome.findMany({
      where: { userId, contentVersionId },
      orderBy: [{ completedAt: 'desc' }, { questionId: 'asc' }],
    });
  }

  findShadowingAttempt(userId: string, contentVersionId: string) {
    return this.prisma.libraryShadowingAttempt.findFirst({
      where: { userId, contentVersionId, finalizedAt: null },
      orderBy: { updatedAt: 'desc' },
    });
  }
  listShadowingAttempts(userId: string, contentVersionId: string) {
    return this.prisma.libraryShadowingAttempt.findMany({
      where: { userId, contentVersionId },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
  }
  async upsertShadowingAttempt(
    userId: string,
    contentVersionId: string,
    data: {
      segmentIndex: number;
      positionSeconds: number;
      status: 'ACTIVE' | 'PAUSED';
      selfRating?: number;
    },
  ) {
    const existing = await this.prisma.libraryShadowingAttempt.findFirst({
      where: { userId, contentVersionId },
      orderBy: { updatedAt: 'desc' },
    });
    if (existing?.finalizedAt) return existing;
    if (existing)
      return this.prisma.libraryShadowingAttempt.update({
        where: { attemptKey: existing.attemptKey },
        data,
      });
    return this.prisma.libraryShadowingAttempt.create({
      data: { userId, contentVersionId, ...data },
    });
  }
  async finalizeShadowingAttempt(
    userId: string,
    contentVersionId: string,
    data: { segmentIndex: number; positionSeconds: number; selfRating: number },
  ) {
    const existing = await this.prisma.libraryShadowingAttempt.findFirst({
      where: { userId, contentVersionId },
      orderBy: { updatedAt: 'desc' },
    });
    if (existing?.finalizedAt) return existing;
    if (existing)
      return this.prisma.libraryShadowingAttempt.update({
        where: { attemptKey: existing.attemptKey },
        data: { ...data, status: 'FINALIZED', finalizedAt: new Date() },
      });
    return this.prisma.libraryShadowingAttempt.create({
      data: {
        userId,
        contentVersionId,
        ...data,
        status: 'FINALIZED',
        finalizedAt: new Date(),
      },
    });
  }
}
