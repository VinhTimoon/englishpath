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
import { ROADMAP_REPOSITORY } from '../src/modules/roadmap/roadmap.models';
import type { RoadmapRepository } from '../src/modules/roadmap/roadmap.ports';
import type { RoadmapView } from '../src/modules/roadmap/roadmap.models';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Roadmap and today vertical slice (e2e)', () => {
  let app: INestApplication<App>;
  const external = createExternalIdentity({
    provider: 'SUPABASE',
    subject: 'roadmap-user',
    issuer: 'issuer',
    audience: 'authenticated',
  });
  const principal = createApplicationPrincipal({
    applicationUserId: 'application-user-001',
    externalIdentity: external,
    roles: ['FREE_USER'],
    ownerships: [],
    entitlements: [],
  });
  const seed = {
    goal: 'ENGLISH_FOUNDATION' as const,
    level: 'BEGINNER' as const,
    durationDays: 30 as const,
    dailyMinutes: 20,
    prioritySkills: ['VOCABULARY' as const],
  };
  const item = {
    id: 'item-001',
    dayNumber: 1,
    sequence: 1,
    phase: 'FOUNDATION' as const,
    skill: 'VOCABULARY' as const,
    taskType: 'VOCABULARY' as const,
    title: 'Từ vựng theo chủ đề',
    minutes: 7,
    status: 'PENDING' as const,
    completedAt: null,
  };
  const roadmap = {
    id: 'roadmap-001',
    version: 1,
    goal: seed.goal,
    level: seed.level,
    durationDays: seed.durationDays,
    dailyMinutes: seed.dailyMinutes,
    status: 'ACTIVE' as const,
    previousRoadmapId: null,
    generatedAt: new Date(),
    items: [item],
  };
  const repository: jest.Mocked<RoadmapRepository> = {
    loadSeed: jest.fn(),
    findCurrent: jest.fn(),
    createVersion: jest.fn(),
    updateItem: jest.fn(),
  };

  beforeEach(async () => {
    repository.loadSeed.mockResolvedValue(seed);
    repository.findCurrent.mockResolvedValue(null);
    repository.createVersion.mockResolvedValue(roadmap);
    repository.updateItem.mockResolvedValue({
      ...roadmap,
      items: [{ ...item, status: 'COMPLETED', completedAt: new Date() }],
    });
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({ $queryRaw: jest.fn().mockResolvedValue([{ result: 1 }]) })
      .overrideProvider(EXTERNAL_IDENTITY_VERIFIER)
      .useValue({ verify: jest.fn().mockResolvedValue(external) })
      .overrideProvider(APPLICATION_PRINCIPAL_RESOLVER)
      .useValue({ resolve: jest.fn().mockResolvedValue(principal) })
      .overrideProvider(ROADMAP_REPOSITORY)
      .useValue(repository)
      .compile();
    app = module.createNestApplication();
    await app.init();
  });

  it('generates from server-owned learner data and returns today tasks', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/roadmaps/generate')
      .set('Authorization', 'Bearer local.token.value')
      .send({ userId: 'attacker' })
      .expect(201);
    expect(repository.loadSeed.mock.calls[0]).toEqual(['application-user-001']);
    expect(repository.createVersion.mock.calls[0]?.[0]).toBe(
      'application-user-001',
    );
    const body = response.body as { data: { todayItems: unknown[] } };
    expect(body.data.todayItems).toHaveLength(1);
  });

  it('returns an additive owner-scoped Four Skills projection', async () => {
    const current: RoadmapView = {
      ...roadmap,
      items: [
        {
          ...item,
          id: 'reading-1',
          skill: 'READING',
          taskType: 'READING',
          status: 'COMPLETED',
          completedAt: new Date(),
        },
        {
          ...item,
          id: 'listening-1',
          skill: 'LISTENING',
          taskType: 'LISTENING',
        },
      ],
    };
    repository.findCurrent.mockResolvedValue(current);

    const response = await request(app.getHttpServer())
      .get('/api/v1/roadmaps/current')
      .set('Authorization', 'Bearer local.token.value')
      .expect(200);
    expect(repository.findCurrent.mock.calls[0]).toEqual([
      'application-user-001',
    ]);
    const body = response.body as {
      data: {
        fourSkills: Array<Record<string, unknown>>;
        todayItems: unknown[];
        items: unknown[];
      };
    };
    expect(body.data.items).toHaveLength(2);
    expect(body.data.todayItems).toHaveLength(2);
    expect(body.data.fourSkills).toHaveLength(4);
    expect(body.data.fourSkills.map((entry) => entry.skill)).toEqual([
      'READING',
      'LISTENING',
      'SPEAKING',
      'WRITING',
    ]);
    expect(Object.keys(body.data.fourSkills[0] ?? {}).sort()).toEqual([
      'activityKind',
      'allocationReason',
      'availability',
      'completionState',
      'reference',
      'skill',
      'target',
    ]);
    expect(body.data.fourSkills[0]).toEqual(
      expect.objectContaining({
        target: 1,
        reference: 'reading-1',
        completionState: 'COMPLETED',
        availability: 'AVAILABLE',
      }),
    );
    expect(body.data.fourSkills[2]).toEqual(
      expect.objectContaining({
        target: null,
        reference: null,
        completionState: 'UNAVAILABLE',
        availability: 'UNAVAILABLE',
      }),
    );
    expect(JSON.stringify(body.data.fourSkills)).not.toMatch(
      /provider|rubric|submission|credential|answer/i,
    );
  });

  it('updates only an owner task and validates status', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/roadmaps/items/item-001/status')
      .set('Authorization', 'Bearer local.token.value')
      .send({ status: 'COMPLETED' })
      .expect(200);
    expect(repository.updateItem.mock.calls[0]).toEqual([
      'application-user-001',
      'item-001',
      'COMPLETED',
    ]);
    await request(app.getHttpServer())
      .patch('/api/v1/roadmaps/items/item-001/status')
      .set('Authorization', 'Bearer local.token.value')
      .send({ status: 'HACKED' })
      .expect(400);
  });

  it('requires authentication and onboarding plus placement seed', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/roadmaps/current')
      .expect(401);
    repository.loadSeed.mockResolvedValue(null);
    await request(app.getHttpServer())
      .post('/api/v1/roadmaps/generate')
      .set('Authorization', 'Bearer local.token.value')
      .expect(409);
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });
});
