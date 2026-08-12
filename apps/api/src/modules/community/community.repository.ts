import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import { CommunityPostStatus } from '../../generated/prisma/enums';
import { randomUUID, createHash } from 'node:crypto';

function isUniqueConstraintError(error: unknown) {
  return (
    (typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002') ||
    (error instanceof Error && error.message.includes('Unique constraint'))
  );
}

@Injectable()
export class CommunityRepository {
  constructor(private readonly prisma: PrismaService) {}
  async create(ownerUserId: string, title: string, body: string, key: string) {
    const hash = createHash('sha256')
      .update(JSON.stringify({ title, body }))
      .digest('hex');
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existing = await tx.communityPost.findFirst({
          where: { ownerUserId, creationIdempotencyKey: key },
        });
        if (existing) {
          if (existing.creationRequestHash !== hash)
            throw new Error('IDEMPOTENCY_CONFLICT');
          return { post: existing, replayed: true };
        }
        const post = await tx.communityPost.create({
          data: {
            ownerUserId,
            title,
            body,
            creationIdempotencyKey: key,
            creationRequestHash: hash,
          },
        });
        return { post, replayed: false };
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      const replay = await this.prisma.communityPost.findFirst({
        where: { ownerUserId, creationIdempotencyKey: key },
      });
      if (replay && replay.creationRequestHash === hash)
        return { post: replay, replayed: true };
      throw new Error('IDEMPOTENCY_CONFLICT');
    }
  }
  published(limit: number, offset: number) {
    return this.prisma.communityPost.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: offset,
      take: limit,
      select: {
        id: true,
        title: true,
        body: true,
        createdAt: true,
        publishedAt: true,
      },
    });
  }
  countPublished() {
    return this.prisma.communityPost.count({ where: { status: 'PUBLISHED' } });
  }
  queue(limit: number, offset: number) {
    return this.prisma.communityPost.findMany({
      where: { status: { in: ['PENDING_REVIEW', 'FLAGGED'] } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      skip: offset,
      take: limit,
      select: {
        id: true,
        title: true,
        body: true,
        status: true,
        createdAt: true,
        _count: { select: { reports: true } },
        reports: { select: { reason: true } },
      },
    });
  }
  countQueue() {
    return this.prisma.communityPost.count({
      where: { status: { in: ['PENDING_REVIEW', 'FLAGGED'] } },
    });
  }
  async report(
    postId: string,
    reporterUserId: string,
    reason: 'SPAM' | 'HARASSMENT' | 'HARMFUL_CONTENT' | 'COPYRIGHT' | 'OTHER',
    key: string,
    correlationId: string,
  ) {
    const hash = createHash('sha256')
      .update(JSON.stringify({ postId, reason }))
      .digest('hex');
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existing = await tx.communityReport.findUnique({
          where: {
            reporterUserId_idempotencyKey: {
              reporterUserId,
              idempotencyKey: key,
            },
          },
        });
        if (existing) {
          if (existing.requestHash !== hash)
            throw new Error('IDEMPOTENCY_CONFLICT');
          return { reported: true, replayed: true };
        }
        const post = await tx.communityPost.findFirst({
          where: { id: postId, status: 'PUBLISHED' },
        });
        if (!post) return null;
        const duplicate = await tx.communityReport.findUnique({
          where: { postId_reporterUserId: { postId, reporterUserId } },
        });
        if (duplicate) return { reported: true, replayed: true };
        await tx.communityReport.create({
          data: {
            id: randomUUID(),
            postId,
            reporterUserId,
            reason,
            idempotencyKey: key,
            requestHash: hash,
            correlationId,
          },
        });
        const count = await tx.communityReport.count({ where: { postId } });
        if (count >= 1)
          await tx.communityPost.update({
            where: { id: postId },
            data: { status: 'FLAGGED' },
          });
        return { reported: true, replayed: false };
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      const replay = await this.prisma.communityReport.findUnique({
        where: {
          reporterUserId_idempotencyKey: {
            reporterUserId,
            idempotencyKey: key,
          },
        },
      });
      if (replay) {
        if (replay.requestHash !== hash)
          throw new Error('IDEMPOTENCY_CONFLICT');
        return { reported: true, replayed: true };
      }
      const duplicate = await this.prisma.communityReport.findUnique({
        where: { postId_reporterUserId: { postId, reporterUserId } },
      });
      if (duplicate) return { reported: true, replayed: true };
      throw new Error('IDEMPOTENCY_CONFLICT');
    }
  }
  async decide(
    postId: string,
    actorUserId: string,
    key: string,
    decision: 'PUBLISH' | 'REJECT' | 'ARCHIVE',
    correlationId: string,
    appendAudit?: (client: Prisma.TransactionClient) => Promise<unknown>,
  ) {
    const hash = createHash('sha256')
      .update(JSON.stringify({ postId, decision }))
      .digest('hex');
    try {
      return await this.prisma.$transaction(async (tx) => {
        const old = await tx.communityDecision.findUnique({
          where: {
            actorUserId_idempotencyKey: { actorUserId, idempotencyKey: key },
          },
        });
        if (old) {
          if (old.requestHash !== hash) throw new Error('IDEMPOTENCY_CONFLICT');
          return {
            post: await tx.communityPost.findUnique({ where: { id: postId } }),
            replayed: true,
          };
        }
        const allowedStates: CommunityPostStatus[] =
          decision === 'REJECT'
            ? ['PENDING_REVIEW']
            : ['PENDING_REVIEW', 'FLAGGED'];
        await tx.communityDecision.create({
          data: {
            id: randomUUID(),
            postId,
            actorUserId,
            idempotencyKey: key,
            requestHash: hash,
            decision,
            correlationId,
          },
        });
        const status =
          decision === 'PUBLISH'
            ? 'PUBLISHED'
            : decision === 'REJECT'
              ? 'REJECTED'
              : 'ARCHIVED';
        const changed = await tx.communityPost.updateMany({
          where: { id: postId, status: { in: allowedStates } },
          data: {
            status,
            publishedAt: status === 'PUBLISHED' ? new Date() : null,
          },
        });
        if (changed.count !== 1) throw new Error('INVALID_TRANSITION');
        const updated = await tx.communityPost.findUnique({
          where: { id: postId },
        });
        if (!updated) throw new Error('INVALID_TRANSITION');
        if (appendAudit) await appendAudit(tx);
        return { post: updated, replayed: false };
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      const replay = await this.prisma.communityDecision.findUnique({
        where: {
          actorUserId_idempotencyKey: { actorUserId, idempotencyKey: key },
        },
      });
      if (!replay || replay.requestHash !== hash)
        throw new Error('IDEMPOTENCY_CONFLICT');
      return {
        post: await this.prisma.communityPost.findUnique({
          where: { id: postId },
        }),
        replayed: true,
      };
    }
  }
}
