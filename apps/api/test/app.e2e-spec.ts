import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import fs from 'node:fs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import {
  VOCABULARY_REPOSITORY,
  type VocabularyRepository,
} from './../src/modules/vocabulary/vocabulary.models';
import { PrismaService } from './../src/prisma/prisma.service';

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

describe('API (e2e)', () => {
  let app: INestApplication<App>;
  const prisma = {
    $queryRaw: jest.fn(),
  };

  async function createApp(
    repository?: VocabularyRepository,
  ): Promise<INestApplication<App>> {
    let builder = Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma);
    if (repository) {
      builder = builder
        .overrideProvider(VOCABULARY_REPOSITORY)
        .useValue(repository);
    }
    const moduleFixture: TestingModule = await builder.compile();
    const application = moduleFixture.createNestApplication();
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
