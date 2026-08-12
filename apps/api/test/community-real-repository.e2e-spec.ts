import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import {
  createApplicationPrincipal,
  createExternalIdentity,
} from '../src/modules/access';
import {
  APPLICATION_PRINCIPAL_RESOLVER,
  EXTERNAL_IDENTITY_VERIFIER,
} from '../src/modules/auth/auth.tokens';
import { PrismaService } from '../src/prisma/prisma.service';

type Status =
  'PENDING_REVIEW' | 'PUBLISHED' | 'FLAGGED' | 'REJECTED' | 'ARCHIVED';
type Post = {
  id: string;
  ownerUserId: string;
  creationIdempotencyKey: string;
  creationRequestHash: string;
  title: string;
  body: string;
  status: Status;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
};
type Report = {
  postId: string;
  reporterUserId: string;
  reason: string;
  idempotencyKey: string;
  requestHash: string;
  correlationId: string;
};
type Decision = {
  postId: string;
  actorUserId: string;
  idempotencyKey: string;
  requestHash: string;
  decision: string;
  correlationId: string;
};
type ApiEnvelope = {
  error?: { details?: unknown };
  meta?: { idempotencyStatus?: string };
};

class CommunityPrismaFixture {
  readonly posts: Post[] = [
    {
      id: 'post-002',
      ownerUserId: 'other-learner',
      creationIdempotencyKey: 'seed-post-002',
      creationRequestHash: 'seed',
      title: 'Published title',
      body: 'Published body',
      status: 'PUBLISHED',
      createdAt: new Date('2026-08-11T00:00:00.000Z'),
      updatedAt: new Date('2026-08-11T00:00:00.000Z'),
      publishedAt: new Date('2026-08-11T00:00:00.000Z'),
    },
  ];
  readonly reports: Report[] = [];
  readonly decisions: Decision[] = [];
  readonly auditEvents: Record<string, unknown>[] = [];
  private nextId = 1;

  readonly communityPost = {
    findFirst: (args: { where: Record<string, unknown> }) =>
      this.posts.find((post) => {
        const where = args.where;
        return Object.entries(where).every(
          ([key, value]) => post[key as keyof Post] === value,
        );
      }) ?? null,
    findUnique: (args: { where: Record<string, unknown> }) =>
      this.posts.find((post) => post.id === args.where.id) ?? null,
    create: (args: {
      data: Omit<
        Post,
        'id' | 'status' | 'createdAt' | 'updatedAt' | 'publishedAt'
      >;
    }) => {
      const now = new Date('2026-08-12T00:00:00.000Z');
      const post: Post = {
        ...args.data,
        id: `post-${this.nextId++}`,
        status: 'PENDING_REVIEW',
        createdAt: now,
        updatedAt: now,
        publishedAt: null,
      };
      this.posts.push(post);
      return post;
    },
    update: (args: {
      where: { id: string };
      data: { status: Status; publishedAt?: Date | null };
    }) => {
      const post = this.posts.find(
        (candidate) => candidate.id === args.where.id,
      );
      if (!post) throw new Error('missing post');
      post.status = args.data.status;
      post.publishedAt = args.data.publishedAt ?? post.publishedAt;
      post.updatedAt = new Date('2026-08-12T00:00:00.000Z');
      return post;
    },
    updateMany: (args: {
      where: { id: string; status: { in: Status[] } };
      data: { status: Status; publishedAt?: Date | null };
    }) => {
      const post = this.posts.find(
        (candidate) =>
          candidate.id === args.where.id &&
          args.where.status.in.includes(candidate.status),
      );
      if (!post) return { count: 0 };
      post.status = args.data.status;
      post.publishedAt = args.data.publishedAt ?? post.publishedAt;
      post.updatedAt = new Date('2026-08-12T00:00:00.000Z');
      return { count: 1 };
    },
    findMany: (args: {
      where: { status: Status | { in: Status[] } };
      skip: number;
      take: number;
    }) => {
      const status = args.where.status;
      const posts = this.posts.filter((post) =>
        typeof status === 'string'
          ? post.status === status
          : status.in.includes(post.status),
      );
      return posts.slice(args.skip, args.skip + args.take).map((post) => ({
        ...post,
        _count: {
          reports: this.reports.filter((report) => report.postId === post.id)
            .length,
        },
        reports: this.reports
          .filter((report) => report.postId === post.id)
          .map((report) => ({ reason: report.reason })),
      }));
    },
    count: (args: { where: { status: Status | { in: Status[] } } }) => {
      const status = args.where.status;
      return this.posts.filter((post) =>
        typeof status === 'string'
          ? post.status === status
          : status.in.includes(post.status),
      ).length;
    },
  };
  readonly communityReport = {
    findUnique: (args: { where: Record<string, unknown> }) => {
      const where = args.where;
      const key = where.reporterUserId_idempotencyKey as
        { reporterUserId: string; idempotencyKey: string } | undefined;
      if (key)
        return (
          this.reports.find(
            (report) =>
              report.reporterUserId === key.reporterUserId &&
              report.idempotencyKey === key.idempotencyKey,
          ) ?? null
        );
      const duplicate = where.postId_reporterUserId as
        { postId: string; reporterUserId: string } | undefined;
      return duplicate
        ? (this.reports.find(
            (report) =>
              report.postId === duplicate.postId &&
              report.reporterUserId === duplicate.reporterUserId,
          ) ?? null)
        : null;
    },
    create: (args: { data: Report }) => {
      this.reports.push(args.data);
      return args.data;
    },
    count: (args: { where: { postId: string } }) =>
      this.reports.filter((report) => report.postId === args.where.postId)
        .length,
  };
  readonly communityDecision = {
    findUnique: (args: {
      where: {
        actorUserId_idempotencyKey: {
          actorUserId: string;
          idempotencyKey: string;
        };
      };
    }) =>
      this.decisions.find(
        (decision) =>
          decision.actorUserId ===
            args.where.actorUserId_idempotencyKey.actorUserId &&
          decision.idempotencyKey ===
            args.where.actorUserId_idempotencyKey.idempotencyKey,
      ) ?? null,
    create: (args: { data: Decision }) => {
      this.decisions.push(args.data);
      return args.data;
    },
  };
  readonly privilegedAuditEvent = {
    create: (args: { data: Record<string, unknown> }) => {
      this.auditEvents.push(args.data);
      return args.data;
    },
  };

  readonly $transaction = async <T>(
    callback: (client: CommunityPrismaFixture) => Promise<T>,
  ) => callback(this);
  readonly $queryRaw = () => [{ result: 1 }];
}

describe('community API with real repository boundary (e2e)', () => {
  let app: INestApplication<App>;
  let fixture: CommunityPrismaFixture;
  const external = createExternalIdentity({
    provider: 'SUPABASE',
    subject: 'community-real-user',
    issuer: 'issuer',
    audience: 'authenticated',
  });
  const learner = createApplicationPrincipal({
    applicationUserId: 'community-real-learner',
    externalIdentity: external,
    roles: ['FREE_USER'],
    ownerships: [],
    entitlements: [],
  });
  const editor = createApplicationPrincipal({
    applicationUserId: 'community-real-editor',
    externalIdentity: external,
    roles: ['CONTENT_EDITOR'],
    ownerships: [],
    entitlements: [],
  });
  let principal = learner;

  beforeEach(async () => {
    fixture = new CommunityPrismaFixture();
    principal = learner;
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(fixture)
      .overrideProvider(EXTERNAL_IDENTITY_VERIFIER)
      .useValue({ verify: jest.fn().mockResolvedValue(external) })
      .overrideProvider(APPLICATION_PRINCIPAL_RESOLVER)
      .useValue({ resolve: jest.fn().mockImplementation(() => principal) })
      .compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => app.close());

  it('exercises repository transactions for create, report, moderation, and replay', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/community/posts')
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'real-create-1')
      .send({ title: 'New title', body: 'New body' })
      .expect(201);
    expect((created.body as { data: { status: string } }).data.status).toBe(
      'PENDING_REVIEW',
    );
    await request(app.getHttpServer())
      .post('/api/v1/community/posts')
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'real-create-1')
      .send({ title: 'New title', body: 'New body' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/community/posts')
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'real-create-1')
      .send({ title: 'Changed title', body: 'New body' })
      .expect(409);

    await request(app.getHttpServer())
      .post('/api/v1/community/posts/post-002/reports')
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'real-report-1')
      .send({ reason: 'SPAM' })
      .expect(201);
    const unpublishedReport = await request(app.getHttpServer())
      .post('/api/v1/community/posts/post-1/reports')
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'real-report-unpublished')
      .send({ reason: 'SPAM' })
      .expect(404);
    expect(JSON.stringify(unpublishedReport.body)).not.toMatch(
      /post-1|PENDING_REVIEW/,
    );
    expect(fixture.posts.find((post) => post.id === 'post-002')?.status).toBe(
      'FLAGGED',
    );

    principal = editor;
    const queue = await request(app.getHttpServer())
      .get('/api/v1/community/moderation/queue')
      .set('Authorization', 'Bearer local.token.value')
      .expect(200);
    expect((queue.body as { data: unknown[] }).data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'post-002', status: 'FLAGGED' }),
      ]),
    );
    const invalidFlaggedReject = await request(app.getHttpServer())
      .post('/api/v1/community/moderation/post-002/decision')
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'real-decision-invalid')
      .send({ decision: 'REJECT' })
      .expect(409);
    expect((invalidFlaggedReject.body as ApiEnvelope).error?.details).toEqual(
      [],
    );
    const firstDecision = await request(app.getHttpServer())
      .post('/api/v1/community/moderation/post-002/decision')
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'real-decision-1')
      .send({ decision: 'PUBLISH' })
      .expect(201);
    expect((firstDecision.body as ApiEnvelope).meta?.idempotencyStatus).toBe(
      'created',
    );
    expect(fixture.auditEvents).toHaveLength(1);
    const replayDecision = await request(app.getHttpServer())
      .post('/api/v1/community/moderation/post-002/decision')
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'real-decision-1')
      .send({ decision: 'PUBLISH' })
      .expect(201);
    expect((replayDecision.body as ApiEnvelope).meta?.idempotencyStatus).toBe(
      'replayed',
    );
    expect(fixture.auditEvents).toHaveLength(1);

    principal = learner;
    await request(app.getHttpServer())
      .post('/api/v1/community/moderation/post-1/decision')
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'real-decision-reject')
      .send({ decision: 'REJECT' })
      .expect(403);
  });
});
