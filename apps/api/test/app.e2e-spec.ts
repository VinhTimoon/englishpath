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

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });
});
