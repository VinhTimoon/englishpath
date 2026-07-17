import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
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
  meta: { correlationId: string };
};

describe('API (e2e)', () => {
  let app: INestApplication<App>;
  const prisma = {
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    prisma.$queryRaw.mockResolvedValue([{ result: 1 }]);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
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
  });

  it('returns sanitized not-found and correlation failures', async () => {
    const missing = await request(app.getHttpServer())
      .get('/api/v1/vocabulary/mindmap?rootId=missing-root')
      .expect(404);
    expect((missing.body as ApiEnvelope).error?.code).toBe(
      'RESOURCE_NOT_FOUND',
    );

    const invalidCorrelation = await request(app.getHttpServer())
      .get('/api/v1/vocabulary/topics')
      .set('X-Correlation-Id', 'bad')
      .expect(400);
    expect((invalidCorrelation.body as ApiEnvelope).error?.code).toBe(
      'VALIDATION_FAILED',
    );
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });
});
