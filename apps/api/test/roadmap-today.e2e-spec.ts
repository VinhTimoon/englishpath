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
import { PRACTICE_REPOSITORY } from '../src/modules/practice/practice.models';
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
  const practiceRepository = {
    roadmapAdaptiveEvidence: jest.fn(),
  };
  const principalResolver = {
    resolve: jest.fn().mockResolvedValue(principal),
  };

  beforeEach(async () => {
    principalResolver.resolve.mockResolvedValue(principal);
    repository.loadSeed.mockResolvedValue(seed);
    repository.findCurrent.mockResolvedValue(null);
    repository.createVersion.mockResolvedValue(roadmap);
    repository.updateItem.mockResolvedValue({
      ...roadmap,
      items: [{ ...item, status: 'COMPLETED', completedAt: new Date() }],
    });
    practiceRepository.roadmapAdaptiveEvidence.mockResolvedValue({
      policyVersion: 'adaptive-roadmap-v1',
      domains: [
        { domain: 'GENERAL', state: 'empty', entryCount: 0 },
        { domain: 'LISTENING', state: 'empty', entryCount: 0 },
        { domain: 'READING', state: 'empty', entryCount: 0 },
        { domain: 'SPEAKING', state: 'unavailable', entryCount: 0 },
        { domain: 'WRITING', state: 'unavailable', entryCount: 0 },
      ],
    });
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({ $queryRaw: jest.fn().mockResolvedValue([{ result: 1 }]) })
      .overrideProvider(EXTERNAL_IDENTITY_VERIFIER)
      .useValue({ verify: jest.fn().mockResolvedValue(external) })
      .overrideProvider(APPLICATION_PRINCIPAL_RESOLVER)
      .useValue(principalResolver)
      .overrideProvider(ROADMAP_REPOSITORY)
      .useValue(repository)
      .overrideProvider(PRACTICE_REPOSITORY)
      .useValue(practiceRepository)
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

  it('keeps recalculation evidence owner-scoped across authenticated learners', async () => {
    const secondPrincipal = createApplicationPrincipal({
      applicationUserId: 'application-user-002',
      externalIdentity: createExternalIdentity({
        provider: 'SUPABASE',
        subject: 'roadmap-user-2',
        issuer: 'issuer',
        audience: 'authenticated',
      }),
      roles: ['FREE_USER'],
      ownerships: [],
      entitlements: [],
    });
    repository.findCurrent.mockResolvedValue(roadmap);
    principalResolver.resolve
      .mockResolvedValueOnce(principal)
      .mockResolvedValueOnce(secondPrincipal);

    await request(app.getHttpServer())
      .post('/api/v1/roadmaps/recalculate')
      .set('Authorization', 'Bearer learner-1')
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/roadmaps/recalculate')
      .set('Authorization', 'Bearer learner-2')
      .expect(201);

    expect(practiceRepository.roadmapAdaptiveEvidence.mock.calls).toEqual([
      ['application-user-001'],
      ['application-user-002'],
    ]);
    expect(repository.findCurrent.mock.calls).toEqual([
      ['application-user-001'],
      ['application-user-002'],
    ]);
  });

  it('fails closed when the adaptive evidence projection is malformed', async () => {
    repository.findCurrent.mockResolvedValue(roadmap);
    practiceRepository.roadmapAdaptiveEvidence.mockResolvedValueOnce(null);

    const response = await request(app.getHttpServer())
      .post('/api/v1/roadmaps/recalculate')
      .set('Authorization', 'Bearer local.token.value')
      .expect(201);

    expect(repository.createVersion.mock.calls).toHaveLength(0);
    expect((response.body as { data: RoadmapView }).data.id).toBe(roadmap.id);
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

  it('recalculates from owner evidence, persists slot ordering, and no-ops on replay', async () => {
    const current: RoadmapView = {
      ...roadmap,
      items: [
        {
          ...item,
          id: 'completed',
          sequence: 1,
          status: 'COMPLETED',
          completedAt: new Date(),
        },
        {
          ...item,
          id: 'listening',
          sequence: 2,
          skill: 'LISTENING',
          taskType: 'LISTENING',
        },
        {
          ...item,
          id: 'reading',
          sequence: 3,
          skill: 'READING',
          taskType: 'READING',
        },
      ],
    };
    const historicalItems = current.items.map((value) => ({ ...value }));
    const successor: RoadmapView = {
      ...current,
      id: 'roadmap-002',
      version: 2,
      previousRoadmapId: current.id,
      items: [
        current.items[0],
        { ...current.items[2], sequence: 2 },
        { ...current.items[1], sequence: 3 },
      ],
    };
    repository.findCurrent
      .mockResolvedValueOnce(current)
      .mockResolvedValueOnce(successor);
    repository.createVersion.mockResolvedValue(successor);
    practiceRepository.roadmapAdaptiveEvidence.mockResolvedValue({
      policyVersion: 'adaptive-roadmap-v1',
      domains: [
        { domain: 'GENERAL', state: 'empty', entryCount: 0 },
        { domain: 'LISTENING', state: 'empty', entryCount: 0 },
        { domain: 'READING', state: 'available', entryCount: 2 },
        { domain: 'SPEAKING', state: 'unavailable', entryCount: 0 },
        { domain: 'WRITING', state: 'unavailable', entryCount: 0 },
      ],
    });

    const first = await request(app.getHttpServer())
      .post('/api/v1/roadmaps/recalculate')
      .set('Authorization', 'Bearer local.token.value')
      .send({ userId: 'attacker', evidence: { entryCount: 999 } })
      .expect(201);
    expect(
      practiceRepository.roadmapAdaptiveEvidence.mock.calls,
    ).toContainEqual(['application-user-001']);
    const createCall = repository.createVersion.mock.calls[0];
    expect(createCall?.[0]).toBe('application-user-001');
    expect(createCall?.[1]).toEqual(seed);
    expect(createCall?.[2]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sequence: 2, skill: 'READING' }),
      ]),
    );
    expect(createCall?.[2]).toHaveLength(current.items.length);
    expect(createCall?.[2]?.map(({ dayNumber }) => dayNumber)).toEqual(
      current.items.map(({ dayNumber }) => dayNumber),
    );
    expect(createCall?.[3]).toBe(true);
    expect(createCall?.[2]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sequence: 1,
          status: 'COMPLETED',
          completedAt: current.items[0]?.completedAt,
        }),
      ]),
    );
    expect((first.body as { data: RoadmapView }).data.previousRoadmapId).toBe(
      current.id,
    );
    expect(
      (first.body as { data: RoadmapView & { fourSkills: unknown[] } }).data
        .fourSkills,
    ).toHaveLength(4);
    expect(
      (first.body as { data: RoadmapView & { todayItems: unknown[] } }).data
        .todayItems,
    ).toHaveLength(current.items.length);
    expect(current.items).toEqual(historicalItems);

    await request(app.getHttpServer())
      .post('/api/v1/roadmaps/recalculate')
      .set('Authorization', 'Bearer local.token.value')
      .expect(201);
    expect(repository.createVersion.mock.calls).toHaveLength(1);
    expect(repository.findCurrent.mock.calls).toContainEqual([
      'application-user-001',
    ]);
  });

  it('creates a new owner-scoped successor only after validated evidence changes', async () => {
    const current: RoadmapView = {
      ...roadmap,
      items: [
        { ...item, id: 'vocabulary', sequence: 1 },
        {
          ...item,
          id: 'listening',
          sequence: 2,
          skill: 'LISTENING',
          taskType: 'LISTENING',
        },
        {
          ...item,
          id: 'reading',
          sequence: 3,
          skill: 'READING',
          taskType: 'READING',
        },
      ],
    };
    const successor: RoadmapView = {
      ...current,
      id: 'roadmap-002',
      version: 2,
      previousRoadmapId: current.id,
      items: [
        { ...current.items[0], sequence: 1 },
        { ...current.items[2], sequence: 2 },
        { ...current.items[1], sequence: 3 },
      ],
    };
    const next: RoadmapView = {
      ...successor,
      id: 'roadmap-003',
      version: 3,
      previousRoadmapId: successor.id,
      items: [
        { ...successor.items[0], sequence: 1 },
        { ...successor.items[2], sequence: 2 },
        { ...successor.items[1], sequence: 3 },
      ],
    };
    repository.findCurrent
      .mockResolvedValueOnce(current)
      .mockResolvedValueOnce(successor);
    repository.createVersion
      .mockResolvedValueOnce(successor)
      .mockResolvedValueOnce(next);
    practiceRepository.roadmapAdaptiveEvidence
      .mockResolvedValueOnce({
        policyVersion: 'adaptive-roadmap-v1',
        domains: [
          { domain: 'GENERAL', state: 'empty', entryCount: 0 },
          { domain: 'LISTENING', state: 'empty', entryCount: 0 },
          { domain: 'READING', state: 'available', entryCount: 1 },
          { domain: 'SPEAKING', state: 'unavailable', entryCount: 0 },
          { domain: 'WRITING', state: 'unavailable', entryCount: 0 },
        ],
      })
      .mockResolvedValueOnce({
        policyVersion: 'adaptive-roadmap-v1',
        domains: [
          { domain: 'GENERAL', state: 'empty', entryCount: 0 },
          { domain: 'LISTENING', state: 'available', entryCount: 1 },
          { domain: 'READING', state: 'empty', entryCount: 0 },
          { domain: 'SPEAKING', state: 'unavailable', entryCount: 0 },
          { domain: 'WRITING', state: 'unavailable', entryCount: 0 },
        ],
      });

    const first = await request(app.getHttpServer())
      .post('/api/v1/roadmaps/recalculate')
      .set('Authorization', 'Bearer local.token.value')
      .expect(201);
    const second = await request(app.getHttpServer())
      .post('/api/v1/roadmaps/recalculate')
      .set('Authorization', 'Bearer local.token.value')
      .expect(201);

    expect(repository.createVersion.mock.calls).toHaveLength(2);
    expect(repository.createVersion.mock.calls[0]?.[2]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sequence: 2, skill: 'READING' }),
      ]),
    );
    expect(repository.createVersion.mock.calls[1]?.[2]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sequence: 2, skill: 'LISTENING' }),
      ]),
    );
    expect((first.body as { data: RoadmapView }).data.previousRoadmapId).toBe(
      current.id,
    );
    expect((second.body as { data: RoadmapView }).data.previousRoadmapId).toBe(
      successor.id,
    );
    expect(current.items[0]?.skill).toBe('VOCABULARY');
    expect(JSON.stringify(second.body)).not.toMatch(
      /provider|rubric|submission|credential|correctAnswer|selectedOption/i,
    );
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
    jest.resetAllMocks();
  });
});
