import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ApplicationPrincipal } from '../access';
import { AuditService } from '../audit/audit.service';
import { CommunityRepository } from './community.repository';
import { Decision, ReportReason } from './dto/community.dto';
@Injectable()
export class CommunityService {
  constructor(
    private readonly repo: CommunityRepository,
    private readonly audit: AuditService,
  ) {}
  async create(
    p: ApplicationPrincipal,
    i: { title: string; body: string },
    key: string,
  ) {
    try {
      const result = await this.repo.create(
        p.applicationUserId,
        i.title.trim(),
        i.body.trim(),
        key,
      );
      return { data: this.postView(result.post), replayed: result.replayed };
    } catch (error) {
      if (error instanceof Error && error.message === 'IDEMPOTENCY_CONFLICT')
        throw new ConflictException();
      throw error;
    }
  }
  async list(i: { limit: number; offset: number }, correlationId: string) {
    const [posts, total] = await Promise.all([
      this.repo.published(i.limit, i.offset),
      this.repo.countPublished(),
    ]);
    return {
      data: posts.map((post) => ({
        id: post.id,
        title: post.title,
        body: post.body,
        createdAt: post.createdAt,
        publishedAt: post.publishedAt,
      })),
      meta: {
        correlationId,
        idempotencyStatus: 'not_applicable',
        pagination: {
          limit: i.limit,
          offset: i.offset,
          total,
          hasNext: i.offset + posts.length < total,
        },
      },
    };
  }
  async queue(i: { limit: number; offset: number }, correlationId: string) {
    const [posts, total] = await Promise.all([
      this.repo.queue(i.limit, i.offset),
      this.repo.countQueue(),
    ]);
    return {
      data: posts.map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        status: p.status,
        createdAt: p.createdAt,
        reportCount: p._count.reports,
        reasons: [...new Set(p.reports.map((r) => r.reason))],
      })),
      meta: {
        correlationId,
        idempotencyStatus: 'not_applicable',
        pagination: {
          limit: i.limit,
          offset: i.offset,
          total,
          hasNext: i.offset + posts.length < total,
        },
      },
    };
  }
  async report(
    p: ApplicationPrincipal,
    id: string,
    i: { reason: ReportReason },
    key: string,
    correlationId: string,
  ) {
    try {
      const result = await this.repo.report(
        id,
        p.applicationUserId,
        i.reason,
        key,
        correlationId,
      );
      if (!result) throw new NotFoundException();
      return { data: { reported: true }, replayed: result.replayed };
    } catch (error) {
      if (error instanceof Error && error.message === 'IDEMPOTENCY_CONFLICT')
        throw new ConflictException();
      throw error;
    }
  }

  private postView(post: {
    id: string;
    title: string;
    body: string;
    status: string;
    createdAt: Date;
  }) {
    return {
      id: post.id,
      title: post.title,
      body: post.body,
      status: post.status,
      createdAt: post.createdAt,
    };
  }
  async decide(
    p: ApplicationPrincipal,
    id: string,
    i: { decision: Decision },
    key: string,
    correlationId: string,
  ) {
    try {
      const r = await this.repo.decide(
        id,
        p.applicationUserId,
        key,
        i.decision,
        correlationId,
        (client) =>
          this.audit.appendWithTransaction(client, {
            actorUserId: p.applicationUserId,
            action: 'COMMUNITY_MODERATION_DECISION',
            target: `community-post:${id}`,
            policyResult: 'ALLOW',
            correlationId,
            attributes: { outcome: i.decision },
          }),
      );
      return {
        data: { id: r.post!.id, status: r.post!.status },
        replayed: r.replayed,
      };
    } catch (e) {
      if (e instanceof Error && e.message === 'IDEMPOTENCY_CONFLICT')
        throw new ConflictException('Idempotency key conflict.');
      if (e instanceof Error && e.message === 'INVALID_TRANSITION')
        throw new ConflictException('Moderation decision is not valid.');
      throw e;
    }
  }
}
