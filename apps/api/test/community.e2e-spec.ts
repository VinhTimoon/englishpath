import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import {
  createApplicationPrincipal,
  createExternalIdentity,
  AccessError,
  ACCESS_ERROR_CODES,
} from '../src/modules/access';
import {
  APPLICATION_PRINCIPAL_RESOLVER,
  EXTERNAL_IDENTITY_VERIFIER,
} from '../src/modules/auth/auth.tokens';
import { AuditService } from '../src/modules/audit/audit.service';
import { CommunityRepository } from '../src/modules/community/community.repository';
import { PrismaService } from '../src/prisma/prisma.service';

type CommunityBody = {
  data?: unknown;
  meta?: {
    idempotencyStatus?: string;
    pagination?: {
      limit: number;
      offset: number;
      total: number;
      hasNext: boolean;
    };
  };
  error?: { message?: string; details?: unknown };
};

describe('community moderation API (e2e)', () => {
  let app: INestApplication<App>;
  const external = createExternalIdentity({
    provider: 'SUPABASE',
    subject: 'community-e2e-user',
    issuer: 'issuer',
    audience: 'authenticated',
  });
  const learner = createApplicationPrincipal({
    applicationUserId: 'community-learner',
    externalIdentity: external,
    roles: ['FREE_USER'],
    ownerships: [],
    entitlements: [],
  });
  const editor = createApplicationPrincipal({
    applicationUserId: 'community-editor',
    externalIdentity: external,
    roles: ['CONTENT_EDITOR'],
    ownerships: [],
    entitlements: [],
  });
  const admin = createApplicationPrincipal({
    applicationUserId: 'community-admin',
    externalIdentity: external,
    roles: ['ADMIN'],
    ownerships: [],
    entitlements: [],
  });
  const superAdmin = createApplicationPrincipal({
    applicationUserId: 'community-super-admin',
    externalIdentity: external,
    roles: ['SUPER_ADMIN'],
    ownerships: [],
    entitlements: [],
  });
  let currentPrincipal = learner;
  const resolver = { resolve: jest.fn() };
  const repository = {
    create: jest.fn(),
    published: jest.fn(),
    countPublished: jest.fn(),
    report: jest.fn(),
    queue: jest.fn(),
    countQueue: jest.fn(),
    decide: jest.fn(),
  } as unknown as jest.Mocked<CommunityRepository>;
  const audit = {
    appendWithTransaction: jest.fn(),
  } as unknown as jest.Mocked<AuditService>;

  beforeEach(async () => {
    currentPrincipal = learner;
    jest.clearAllMocks();
    resolver.resolve.mockImplementation(() => currentPrincipal);
    repository.create.mockResolvedValue({
      post: {
        id: 'post-001',
        title: 'A bounded title',
        body: 'A bounded body',
        status: 'PENDING_REVIEW',
        createdAt: new Date('2026-08-12T00:00:00.000Z'),
      },
      replayed: false,
    } as never);
    repository.published.mockResolvedValue([
      {
        id: 'post-002',
        title: 'Published title',
        body: 'Published body',
        createdAt: new Date('2026-08-11T00:00:00.000Z'),
        publishedAt: new Date('2026-08-11T00:00:00.000Z'),
      },
    ] as never);
    repository.countPublished.mockResolvedValue(1);
    repository.report.mockResolvedValue({ reported: true, replayed: false });
    repository.queue.mockResolvedValue([
      {
        id: 'post-003',
        title: 'Flagged title',
        body: 'Flagged body',
        status: 'FLAGGED',
        createdAt: new Date('2026-08-10T00:00:00.000Z'),
        _count: { reports: 1 },
        reports: [{ reason: 'SPAM' }],
      },
    ] as never);
    repository.countQueue.mockResolvedValue(1);
    repository.decide.mockImplementation(async (...args: unknown[]) => {
      const appendAudit = args[5];
      if (typeof appendAudit === 'function')
        await (appendAudit as (client: never) => Promise<unknown>)({} as never);
      return {
        post: { id: 'post-003', status: 'PUBLISHED' },
        replayed: false,
      } as never;
    });
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({ $queryRaw: jest.fn().mockResolvedValue([{ result: 1 }]) })
      .overrideProvider(EXTERNAL_IDENTITY_VERIFIER)
      .useValue({ verify: jest.fn().mockResolvedValue(external) })
      .overrideProvider(APPLICATION_PRINCIPAL_RESOLVER)
      .useValue(resolver)
      .overrideProvider(CommunityRepository)
      .useValue(repository)
      .overrideProvider(AuditService)
      .useValue(audit)
      .compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('requires authentication, strict input, and a mutation idempotency key', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/community/posts')
      .send({ title: 'title', body: 'body' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/community/posts')
      .set('Authorization', 'Bearer local.token.value')
      .send({ title: 'title', body: 'body' })
      .expect(422);
    await request(app.getHttpServer())
      .post('/api/v1/community/posts')
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'community-create-1')
      .send({ title: 'title', body: 'body', status: 'PUBLISHED' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/community/posts')
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'community-create-whitespace')
      .send({ title: '   ', body: '\t' })
      .expect(400);
    const response = await request(app.getHttpServer())
      .post('/api/v1/community/posts')
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'community-create-1')
      .send({ title: 'title', body: 'body' })
      .expect(201);
    const body = response.body as CommunityBody & {
      data: { status?: string; ownerUserId?: string };
    };
    expect(body.data.status).toBe('PENDING_REVIEW');
    expect(body.data.ownerUserId).toBeUndefined();
    expect(repository.create.mock.calls).toContainEqual([
      'community-learner',
      'title',
      'body',
      'community-create-1',
    ]);
  });

  it('returns only published posts with deterministic pagination metadata', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/community/posts?limit=1&offset=0')
      .set('Authorization', 'Bearer local.token.value')
      .expect(200);
    const body = response.body as CommunityBody & { data: unknown[] };
    expect(body.data).toEqual([
      expect.objectContaining({ id: 'post-002', title: 'Published title' }),
    ]);
    expect(body.meta?.pagination).toEqual({
      limit: 1,
      offset: 0,
      total: 1,
      hasNext: false,
    });
    expect(JSON.stringify(response.body)).not.toMatch(
      /ownerUserId|reports|actorUserId|audit|PENDING|FLAGGED/i,
    );
  });

  it('keeps reports owner-attributed and exact retries safe', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/community/posts/post-002/reports')
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'community-report-1')
      .send({ reason: 'SPAM' })
      .expect(201);
    const body = response.body as CommunityBody;
    expect(body.meta?.idempotencyStatus).toBe('created');
    expect(repository.report.mock.calls).toContainEqual([
      'post-002',
      'community-learner',
      'SPAM',
      'community-report-1',
      expect.any(String),
    ]);
    repository.report.mockResolvedValue({ reported: true, replayed: true });
    const replay = await request(app.getHttpServer())
      .post('/api/v1/community/posts/post-002/reports')
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'community-report-1')
      .send({ reason: 'SPAM' })
      .expect(201);
    expect((replay.body as CommunityBody).meta?.idempotencyStatus).toBe(
      'replayed',
    );
  });

  it('separates learner and editor moderation access and audits one decision', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/community/moderation/post-003/decision')
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'community-missing-auth')
      .send({ decision: 'PUBLISH' })
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/v1/community/moderation/queue')
      .set('Authorization', 'Bearer local.token.value')
      .expect(403);
    currentPrincipal = editor;
    const queue = await request(app.getHttpServer())
      .get('/api/v1/community/moderation/queue?limit=10')
      .set('Authorization', 'Bearer local.token.value')
      .expect(200);
    const queueBody = queue.body as CommunityBody & { data: unknown[] };
    expect(queueBody.data[0]).toEqual(
      expect.objectContaining({ status: 'FLAGGED', reportCount: 1 }),
    );
    expect(JSON.stringify(queue.body)).not.toMatch(
      /actorUserId|email|token|rawReportText/i,
    );
    const decision = await request(app.getHttpServer())
      .post('/api/v1/community/moderation/post-003/decision')
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'community-decision-1')
      .send({ decision: 'PUBLISH' })
      .expect(201);
    expect((decision.body as CommunityBody).data).toEqual({
      id: 'post-003',
      status: 'PUBLISHED',
    });
    expect(audit.appendWithTransaction.mock.calls).toHaveLength(1);
    expect(audit.appendWithTransaction.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ attributes: { outcome: 'PUBLISH' } }),
    );
    currentPrincipal = admin;
    await request(app.getHttpServer())
      .get('/api/v1/community/moderation/queue')
      .set('Authorization', 'Bearer local.token.value')
      .expect(200);
    currentPrincipal = superAdmin;
    await request(app.getHttpServer())
      .get('/api/v1/community/moderation/queue')
      .set('Authorization', 'Bearer local.token.value')
      .expect(200);
    currentPrincipal = createApplicationPrincipal({
      applicationUserId: 'community-unknown-role',
      externalIdentity: external,
      roles: ['UNKNOWN_ROLE'],
      ownerships: [],
      entitlements: [],
    });
    await request(app.getHttpServer())
      .get('/api/v1/community/moderation/queue')
      .set('Authorization', 'Bearer local.token.value')
      .expect(403);
  });

  it('does not expose invalid moderation transitions or sensitive errors', async () => {
    currentPrincipal = editor;
    repository.decide.mockRejectedValue(new Error('INVALID_TRANSITION'));
    const response = await request(app.getHttpServer())
      .post('/api/v1/community/moderation/post-003/decision')
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'community-decision-invalid')
      .send({ decision: 'REJECT' })
      .expect(409);
    const body = response.body as CommunityBody;
    expect(body.error?.message).not.toMatch(/INVALID_TRANSITION/);
    expect(body.error?.details).toEqual([]);
    await request(app.getHttpServer())
      .post('/api/v1/community/moderation/not a valid id/decision')
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'community-invalid-id')
      .send({ decision: 'PUBLISH' })
      .expect(422);
    await request(app.getHttpServer())
      .get('/api/v1/community/moderation/queue?limit=101')
      .set('Authorization', 'Bearer local.token.value')
      .expect(400);
    resolver.resolve.mockRejectedValue(
      new AccessError(ACCESS_ERROR_CODES.APPLICATION_IDENTITY_UNRESOLVED),
    );
    await request(app.getHttpServer())
      .get('/api/v1/community/moderation/queue')
      .set('Authorization', 'Bearer local.token.value')
      .expect(403);
  });
});
