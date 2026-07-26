import { Test, TestingModule } from '@nestjs/testing';
import {
  Controller,
  Get,
  INestApplication,
  Module,
  Param,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import fs from 'node:fs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import {
  VOCABULARY_REPOSITORY,
  VOCABULARY_ITEM_REPOSITORY,
  type VocabularyItemRepository,
  type VocabularyRepository,
} from './../src/modules/vocabulary/vocabulary.models';
import { PrismaService } from './../src/prisma/prisma.service';
import {
  APPLICATION_PRINCIPAL_RESOLVER,
  EXTERNAL_IDENTITY_VERIFIER,
  OWNED_PROFILE_REPOSITORY,
} from './../src/modules/auth/auth.tokens';
import {
  createApplicationPrincipal,
  createExternalIdentity,
} from './../src/modules/access';
import { SupabaseJwtVerifier } from './../src/modules/auth/supabase-jwt.verifier';
import { configureOpenApi } from './../src/config/openapi';
import {
  RequireOwner,
  RequireRole,
} from './../src/modules/auth/auth.decorators';
import {
  AuthenticationGuard,
  OwnerGuard,
  RequiredRoleGuard,
} from './../src/modules/auth/auth.guards';
import { AuthExceptionFilter } from './../src/modules/auth/auth-exception.filter';
import { AuthModule } from './../src/modules/auth/auth.module';

@Controller('api/v1/test-authz')
@UseFilters(AuthExceptionFilter)
@UseGuards(AuthenticationGuard, RequiredRoleGuard, OwnerGuard)
@RequireRole('ADMIN')
@RequireOwner('profile')
class AuthorizationTestController {
  @Get(':userId')
  read(@Param('userId') userId: string) {
    return { data: { userId } };
  }
}

@Module({ imports: [AuthModule], controllers: [AuthorizationTestController] })
class AuthorizationTestModule {}

type HealthResponse = {
  status: string;
  api: string;
  database: string;
  timestamp: string;
};

type ApiEnvelope = {
  data?: unknown;
  page?: { totalItems: number };
  error?: { code: string; message: string };
  meta: { correlationId: string; idempotencyStatus: string };
};

type OpenApiResponse = {
  paths: Record<string, unknown>;
  components: { securitySchemes: Record<string, unknown> };
};

describe('API (e2e)', () => {
  let app: INestApplication<App>;
  const prisma = {
    $queryRaw: jest.fn(),
  };

  async function createApp(
    repository?: VocabularyRepository,
    auth?: {
      verifier: { verify(token: string): Promise<unknown> };
      resolver: { resolve(identity: unknown): Promise<unknown> };
      profiles: Record<string, jest.Mock>;
    },
    itemRepository?: VocabularyItemRepository,
  ): Promise<INestApplication<App>> {
    let builder = Test.createTestingModule({
      imports: [AppModule, AuthorizationTestModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma);
    if (repository) {
      builder = builder
        .overrideProvider(VOCABULARY_REPOSITORY)
        .useValue(repository);
    }
    if (itemRepository) {
      builder = builder
        .overrideProvider(VOCABULARY_ITEM_REPOSITORY)
        .useValue(itemRepository);
    }
    if (auth) {
      builder = builder
        .overrideProvider(EXTERNAL_IDENTITY_VERIFIER)
        .useValue(auth.verifier)
        .overrideProvider(APPLICATION_PRINCIPAL_RESOLVER)
        .useValue(auth.resolver)
        .overrideProvider(OWNED_PROFILE_REPOSITORY)
        .useValue(auth.profiles);
    }
    const moduleFixture: TestingModule = await builder.compile();
    const application = moduleFixture.createNestApplication();
    configureOpenApi(application);
    await application.init();
    return application as INestApplication<App>;
  }

  beforeEach(async () => {
    prisma.$queryRaw.mockResolvedValue([{ result: 1 }]);
    app = await createApp();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/api/v1/health (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);
    const body = response.body as HealthResponse;

    expect(body).toMatchObject({
      status: 'ok',
      api: 'running',
      database: 'connected',
    });
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('serves the OpenAPI contract with bearer-protected profile operations', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);
    const body = response.body as OpenApiResponse;
    expect(body.paths).toHaveProperty('/api/v1/profile');
    expect(body.components.securitySchemes).toHaveProperty('bearer');
  });

  it('protects and updates only the authenticated profile', async () => {
    await app.close();
    const external = createExternalIdentity({
      provider: 'SUPABASE',
      subject: 'external-user-001',
      issuer: 'https://project.supabase.co/auth/v1',
      audience: 'authenticated',
    });
    const principal = createApplicationPrincipal({
      applicationUserId: 'application-user-001',
      externalIdentity: external,
      roles: ['FREE_USER'],
      ownerships: [
        { resourceType: 'profile', resourceId: 'application-user-001' },
      ],
      entitlements: [],
    });
    const profiles = {
      findOwned: jest.fn().mockResolvedValue(null),
      upsertOwned: jest
        .fn()
        .mockImplementation(
          (
            _owner: string,
            userId: string,
            profile: Record<string, unknown>,
          ) => ({ userId, ...profile }),
        ),
    };
    app = await createApp(undefined, {
      verifier: { verify: jest.fn().mockResolvedValue(external) },
      resolver: { resolve: jest.fn().mockResolvedValue(principal) },
      profiles,
    });

    await request(app.getHttpServer()).get('/api/v1/profile').expect(401);
    const read = await request(app.getHttpServer())
      .get('/api/v1/profile')
      .set('Authorization', 'Bearer local.signed.token')
      .expect(200);
    const readBody = read.body as ApiEnvelope;
    expect(readBody.data).toBeNull();
    const response = await request(app.getHttpServer())
      .patch('/api/v1/profile')
      .set('Authorization', 'Bearer local.signed.token')
      .set('X-Correlation-Id', 'profile-update-001')
      .send({ displayName: 'Lan', locale: 'vi-VN' })
      .expect(200);
    expect(response.body).toMatchObject({
      data: { userId: 'application-user-001', displayName: 'Lan' },
      meta: { correlationId: 'profile-update-001' },
    });
    expect(profiles.upsertOwned).toHaveBeenCalledWith(
      'application-user-001',
      'application-user-001',
      expect.objectContaining({ displayName: 'Lan' }),
    );
  });

  it('sanitizes a verified token with no active application identity', async () => {
    await app.close();
    const external = createExternalIdentity({
      provider: 'SUPABASE',
      subject: 'missing-user-001',
      issuer: 'issuer',
      audience: 'audience',
    });
    app = await createApp(undefined, {
      verifier: { verify: jest.fn().mockResolvedValue(external) },
      resolver: { resolve: jest.fn().mockResolvedValue(null) },
      profiles: { findOwned: jest.fn(), upsertOwned: jest.fn() },
    });
    const response = await request(app.getHttpServer())
      .get('/api/v1/profile')
      .set('Authorization', 'Bearer secret-token-value')
      .expect(401);
    const body = response.body as ApiEnvelope;
    expect(body.error).toEqual({
      code: 'UNAUTHENTICATED',
      message: 'Authentication failed.',
      details: [],
    });
    expect(JSON.stringify(response.body)).not.toMatch(
      /secret-token|missing-user/,
    );
  });

  it('verifies a locally signed JWT through the HTTP guard', async () => {
    await app.close();
    const { generateKeyPair, SignJWT } = await import('jose');
    const keys = await generateKeyPair('ES256');
    const issuer = 'https://project.supabase.co/auth/v1';
    const verifier = new SupabaseJwtVerifier({
      issuer,
      audience: 'authenticated',
      algorithms: ['ES256'],
      key: () => keys.publicKey,
    });
    const external = createExternalIdentity({
      provider: 'SUPABASE',
      subject: 'external-user-001',
      issuer,
      audience: 'authenticated',
    });
    const principal = createApplicationPrincipal({
      applicationUserId: 'application-user-001',
      externalIdentity: external,
      roles: ['FREE_USER'],
      ownerships: [
        { resourceType: 'profile', resourceId: 'application-user-001' },
      ],
      entitlements: [],
    });
    app = await createApp(undefined, {
      verifier,
      resolver: { resolve: jest.fn().mockResolvedValue(principal) },
      profiles: {
        findOwned: jest.fn().mockResolvedValue(null),
        upsertOwned: jest.fn(),
      },
    });
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'ES256' })
      .setSubject('external-user-001')
      .setIssuer(issuer)
      .setAudience('authenticated')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(keys.privateKey);
    await request(app.getHttpServer())
      .get('/api/v1/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/profile')
      .set('Authorization', 'Basic malformed-secret')
      .expect(401);
    const malformed = await request(app.getHttpServer())
      .get('/api/v1/profile')
      .set('Authorization', 'Bearer malformed-secret-value')
      .expect(401);
    expect(JSON.stringify(malformed.body)).not.toMatch(
      /malformed-secret|JWT|JOSE|stack/i,
    );
  });

  it('normalizes HTTP role and ownership guard decisions', async () => {
    const external = createExternalIdentity({
      provider: 'SUPABASE',
      subject: 'external-user-001',
      issuer: 'issuer',
      audience: 'audience',
    });
    const makePrincipal = (roles: readonly string[]) =>
      createApplicationPrincipal({
        applicationUserId: 'application-user-001',
        externalIdentity: external,
        roles,
        ownerships: [
          { resourceType: 'profile', resourceId: 'application-user-001' },
        ],
        entitlements: [],
      });
    const open = async (principal: ReturnType<typeof makePrincipal>) => {
      await app.close();
      app = await createApp(undefined, {
        verifier: { verify: jest.fn().mockResolvedValue(external) },
        resolver: { resolve: jest.fn().mockResolvedValue(principal) },
        profiles: { findOwned: jest.fn(), upsertOwned: jest.fn() },
      });
    };

    await open(makePrincipal(['ADMIN']));
    await request(app.getHttpServer())
      .get('/api/v1/test-authz/application-user-001')
      .set('Authorization', 'Bearer local.token.value')
      .expect(200);

    await open(makePrincipal(['FREE_USER']));
    const roleDenied = await request(app.getHttpServer())
      .get('/api/v1/test-authz/application-user-001')
      .set('Authorization', 'Bearer local.token.value')
      .set('X-Correlation-Id', 'role-denied-001')
      .expect(403);
    expect(roleDenied.body).toMatchObject({
      error: { code: 'FORBIDDEN', message: 'Access is forbidden.' },
      meta: { correlationId: 'role-denied-001' },
    });

    await open(makePrincipal(['ADMIN']));
    await request(app.getHttpServer())
      .get('/api/v1/test-authz/application-user-002')
      .set('Authorization', 'Bearer local.token.value')
      .expect(403);
  });

  it.each([
    { role: 'ADMIN' },
    { userId: 'another-user' },
    { unknown: 'value' },
    { locale: 'invalid_locale' },
    { avatarUrl: 'http://insecure.example/avatar.png' },
    { timezone: 'invalid_timezone' },
    { displayName: 'x'.repeat(101) },
  ])('rejects profile mass assignment or malformed DTO %p', async (payload) => {
    await app.close();
    const external = createExternalIdentity({
      provider: 'SUPABASE',
      subject: 'external-user-001',
      issuer: 'issuer',
      audience: 'audience',
    });
    const principal = createApplicationPrincipal({
      applicationUserId: 'application-user-001',
      externalIdentity: external,
      roles: ['FREE_USER'],
      ownerships: [
        { resourceType: 'profile', resourceId: 'application-user-001' },
      ],
      entitlements: [],
    });
    app = await createApp(undefined, {
      verifier: { verify: jest.fn().mockResolvedValue(external) },
      resolver: { resolve: jest.fn().mockResolvedValue(principal) },
      profiles: { findOwned: jest.fn(), upsertOwned: jest.fn() },
    });
    const response = await request(app.getHttpServer())
      .patch('/api/v1/profile')
      .set('Authorization', 'Bearer secret-token-value')
      .send(payload)
      .expect(400);
    expect(JSON.stringify(response.body)).not.toContain('secret-token-value');
  });

  it('/api/v1/vocabulary/topics returns governed paginated projections', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/vocabulary/topics?level=toeic-core&toeicPart=3')
      .set('X-Correlation-Id', 'test-correlation-001')
      .expect(200);
    const body = response.body as ApiEnvelope & {
      data: Array<Record<string, unknown>>;
    };

    expect(body.data.map(({ id }) => id)).toEqual(['workplace-meetings']);
    expect(body.page?.totalItems).toBe(1);
    expect(body.meta.correlationId).toBe('test-correlation-001');
    expect(body.meta.idempotencyStatus).toBe('not_applicable');
    expect(JSON.stringify(body)).not.toMatch(
      /checksum|reviewer|licenseStatus|sourceId/i,
    );
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('/api/v1/vocabulary/mindmap returns a bounded tree', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/vocabulary/mindmap?rootId=workplace&depth=2')
      .expect(200);
    const body = response.body as ApiEnvelope & {
      data: { roots: Array<{ id: string; children: unknown[] }> };
    };

    expect(body.data.roots[0].id).toBe('workplace');
    expect(body.data.roots[0].children).toHaveLength(1);
    expect(body.meta.correlationId).toMatch(/^corr-/);
    expect(body.meta.idempotencyStatus).toBe('not_applicable');
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('returns only deterministic published vocabulary item projections', async () => {
    await app.close();
    const listPublished = jest.fn();
    const itemRepository: VocabularyItemRepository = {
      listPublished: listPublished.mockResolvedValue([
        {
          id: 'vocab-work-001',
          taxonomyNodeId: 'workplace-meetings',
          word: 'agenda',
          meaning: 'chương trình họp',
          example: null,
          pronunciation: null,
        },
      ]),
      countPublished: jest.fn().mockResolvedValue(1),
    };
    app = await createApp(undefined, undefined, itemRepository);

    const response = await request(app.getHttpServer())
      .get('/api/v1/vocabulary/items?taxonomyNodeId=workplace-meetings')
      .expect(200);
    const body = response.body as ApiEnvelope & {
      data: Array<Record<string, unknown>>;
    };
    expect(body.data.map(({ word }) => word)).toEqual(['agenda']);
    expect(body.page).toMatchObject({ totalItems: 1, totalPages: 1 });
    expect(JSON.stringify(body)).not.toMatch(
      /source|license|reviewStatus|publishStatus/i,
    );
    expect(listPublished).toHaveBeenCalledWith(
      expect.objectContaining({
        taxonomyNodeId: 'workplace-meetings',
        skip: 0,
        take: 20,
      }),
    );
  });

  it('does not query items for a non-public taxonomy node', async () => {
    await app.close();
    const listPublished = jest.fn();
    const itemRepository: VocabularyItemRepository = {
      listPublished,
      countPublished: jest.fn(),
    };
    app = await createApp(undefined, undefined, itemRepository);
    const response = await request(app.getHttpServer())
      .get('/api/v1/vocabulary/items?taxonomyNodeId=not-public')
      .expect(404);
    expect((response.body as ApiEnvelope).error?.code).toBe(
      'RESOURCE_NOT_FOUND',
    );
    expect(listPublished).not.toHaveBeenCalled();
  });

  it('combines vocabulary track and skill filters', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/vocabulary/topics?track=workplace-english&skill=speaking')
      .expect(200);
    const body = response.body as ApiEnvelope & {
      data: Array<{ id: string }>;
    };
    expect(body.data.map(({ id }) => id)).toEqual(['workplace-meetings']);
  });

  it.each([
    '/api/v1/vocabulary/topics?page=0',
    '/api/v1/vocabulary/topics?size=51',
    '/api/v1/vocabulary/topics?toeicPart=8',
    '/api/v1/vocabulary/topics?toeicPart=abc',
    '/api/v1/vocabulary/topics?level=unsupported',
    '/api/v1/vocabulary/mindmap?depth=4',
    '/api/v1/vocabulary/mindmap?unknown=value',
  ])('rejects malformed vocabulary query %s', async (path) => {
    const response = await request(app.getHttpServer()).get(path).expect(400);
    const body = response.body as ApiEnvelope;
    expect(body.error).toMatchObject({
      code: 'VALIDATION_FAILED',
      message: 'Request validation failed.',
    });
    expect(body.meta.correlationId).toMatch(/^corr-/);
    expect(body.meta.idempotencyStatus).toBe('not_applicable');
  });

  it('returns sanitized not-found and correlation failures', async () => {
    const missing = await request(app.getHttpServer())
      .get('/api/v1/vocabulary/mindmap?rootId=missing-root')
      .expect(404);
    const missingBody = missing.body as ApiEnvelope;
    expect(missingBody.error?.code).toBe('RESOURCE_NOT_FOUND');
    expect(missingBody.meta.idempotencyStatus).toBe('not_applicable');

    const invalidCorrelation = await request(app.getHttpServer())
      .get('/api/v1/vocabulary/topics')
      .set('X-Correlation-Id', 'bad')
      .expect(400);
    const invalidCorrelationBody = invalidCorrelation.body as ApiEnvelope;
    expect(invalidCorrelationBody.error?.code).toBe('VALIDATION_FAILED');
    expect(invalidCorrelationBody.meta.idempotencyStatus).toBe(
      'not_applicable',
    );
  });

  it.each([
    {
      name: 'malformed snapshot',
      path: '/api/v1/vocabulary/topics',
      repository: () => ({
        loadSnapshot: jest.fn().mockResolvedValue({
          nodes: 'private-source-url',
        }),
      }),
    },
    {
      name: 'malformed snapshot',
      path: '/api/v1/vocabulary/mindmap',
      repository: () => ({
        loadSnapshot: jest.fn().mockResolvedValue({
          nodes: 'private-source-url',
        }),
      }),
    },
    {
      name: 'null snapshot',
      path: '/api/v1/vocabulary/topics',
      repository: () => ({ loadSnapshot: jest.fn().mockResolvedValue(null) }),
    },
    {
      name: 'missing nodes',
      path: '/api/v1/vocabulary/mindmap',
      repository: () => ({ loadSnapshot: jest.fn().mockResolvedValue({}) }),
    },
    {
      name: 'provider failure',
      path: '/api/v1/vocabulary/topics',
      repository: () => ({
        loadSnapshot: jest
          .fn()
          .mockRejectedValue(new Error('provider-secret stack detail')),
      }),
    },
    {
      name: 'provider failure',
      path: '/api/v1/vocabulary/mindmap',
      repository: () => ({
        loadSnapshot: jest
          .fn()
          .mockRejectedValue(new Error('provider-secret stack detail')),
      }),
    },
  ])('sanitizes vocabulary adapter $name on $path', async (testCase) => {
    await app.close();
    app = await createApp(testCase.repository());

    const response = await request(app.getHttpServer())
      .get(testCase.path)
      .set('X-Correlation-Id', 'adapter-failure-001')
      .expect(500);
    const body = response.body as ApiEnvelope;

    expect(body).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
        details: [],
      },
      meta: {
        correlationId: 'adapter-failure-001',
        idempotencyStatus: 'not_applicable',
      },
    });
    expect(JSON.stringify(body)).not.toMatch(
      /private-source|provider-secret|stack|checksum|partial/i,
    );
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('keeps vocabulary routes independent from filesystem, network, and credentials', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    const readFileSpy = jest.spyOn(fs, 'readFileSync');
    const writeFileSpy = jest.spyOn(fs, 'writeFileSync');
    const asyncReadFileSpy = jest.spyOn(fs.promises, 'readFile');
    const asyncWriteFileSpy = jest.spyOn(fs.promises, 'writeFile');
    const credentialNames = [
      'DATABASE_URL',
      'DIRECT_URL',
      'SUPABASE_URL',
      'SUPABASE_SECRET_KEY',
    ];
    const originalEnvironment = process.env;
    const environmentReads: string[] = [];
    const credentials = credentialNames.map((name) => process.env[name]);
    credentialNames.forEach((name) => delete process.env[name]);
    process.env = new Proxy(originalEnvironment, {
      get(target, property, receiver) {
        if (typeof property === 'string') environmentReads.push(property);
        return Reflect.get(target, property, receiver) as string | undefined;
      },
    });
    try {
      await request(app.getHttpServer()).get('/').expect(200);
      const transportEnvironmentReads = [...new Set(environmentReads)];
      environmentReads.length = 0;
      await request(app.getHttpServer())
        .get('/api/v1/vocabulary/topics')
        .expect(200);
      await request(app.getHttpServer())
        .get('/api/v1/vocabulary/mindmap')
        .expect(200);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(readFileSpy).not.toHaveBeenCalled();
      expect(writeFileSpy).not.toHaveBeenCalled();
      expect(asyncReadFileSpy).not.toHaveBeenCalled();
      expect(asyncWriteFileSpy).not.toHaveBeenCalled();
      expect([...new Set(environmentReads)]).toEqual(transportEnvironmentReads);
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    } finally {
      process.env = originalEnvironment;
      fetchSpy.mockRestore();
      readFileSpy.mockRestore();
      writeFileSpy.mockRestore();
      asyncReadFileSpy.mockRestore();
      asyncWriteFileSpy.mockRestore();
      credentialNames.forEach((name, index) => {
        const value = credentials[index];
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      });
    }
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });
});
