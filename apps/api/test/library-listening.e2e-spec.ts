/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureOpenApi } from '../src/config/openapi';
import {
  createApplicationPrincipal,
  createExternalIdentity,
} from '../src/modules/access';
import {
  APPLICATION_PRINCIPAL_RESOLVER,
  EXTERNAL_IDENTITY_VERIFIER,
} from '../src/modules/auth/auth.tokens';
import { LIBRARY_CATALOGUE_PORT } from '../src/modules/library/library-catalogue.port';
import { CONTROLLED_MEDIA_PORT } from '../src/modules/library/library-content.ports';
import { PrismaService } from '../src/prisma/prisma.service';

const record = {
  version: {
    contentId: 'player-content',
    versionId: 'player-version',
    createdByActorId: 'actor',
    provenance: 'imported',
    usageScope: 'library',
    accessTier: 'authenticated',
    taxonomy: {
      level: 'B1',
      topic: 'Workplace',
      collocations: [],
      relatedSkills: ['Listening'],
      tracks: ['general'],
      toeicParts: [],
    },
    source: {
      sourceId: 'private-source',
      sourceUrl: 'https://private.example',
      checksum: 'private-checksum',
      sourceVersion: 'private-version',
    },
    rights: {
      owner: 'owner',
      licenseStatus: 'approved',
      allowedUsageScopes: ['library'],
      allowedAccessTiers: ['authenticated'],
      validUntil: '2027-01-01T00:00:00.000Z',
    },
    reviewStatus: 'approved',
    publishStatus: 'published',
  },
  title: 'Listening lesson',
  summary: 'Safe lesson',
  contentType: 'listening',
  durationSeconds: 60,
  transcript: [],
  storage: { provider: 'local', objectKey: 'private-object', state: 'PENDING' },
} as const;

describe('Library listening drill API (e2e)', () => {
  let app: INestApplication<App>;
  let outcome: Record<string, any> | null;
  const catalogue = { load: jest.fn() };
  const media = { resolve: jest.fn() };
  const principal = createApplicationPrincipal({
    applicationUserId: 'listening-learner',
    externalIdentity: createExternalIdentity({
      provider: 'SUPABASE',
      subject: 'listening-subject',
      issuer: 'issuer',
      audience: 'audience',
    }),
    roles: ['FREE_USER'],
    ownerships: [],
    entitlements: [],
  });
  const prisma = {
    libraryDrillOutcome: {
      findUnique: jest.fn(() => Promise.resolve(outcome)),
      create: jest.fn(({ data }: any) => {
        outcome = { ...data, completedAt: new Date('2026-01-01') };
        return Promise.resolve(outcome);
      }),
      findMany: jest.fn(() => Promise.resolve(outcome ? [outcome] : [])),
    },
  };

  beforeEach(async () => {
    outcome = null;
    catalogue.load.mockResolvedValue([record]);
    media.resolve.mockResolvedValue({ state: 'PENDING' });
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(LIBRARY_CATALOGUE_PORT)
      .useValue(catalogue)
      .overrideProvider(CONTROLLED_MEDIA_PORT)
      .useValue(media)
      .overrideProvider(EXTERNAL_IDENTITY_VERIFIER)
      .useValue({
        verify: jest.fn().mockResolvedValue(principal.externalIdentity),
      })
      .overrideProvider(APPLICATION_PRINCIPAL_RESOLVER)
      .useValue({ resolve: jest.fn().mockResolvedValue(principal) })
      .compile();
    app = moduleFixture.createNestApplication();
    configureOpenApi(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it('requires auth and never returns the answer key', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/library/items/player-version/drill')
      .expect(401);
    const response = await request(app.getHttpServer())
      .get('/api/v1/library/items/player-version/drill')
      .set('Authorization', 'Bearer local.signed.token')
      .expect(200);
    expect(response.body.data).toMatchObject({
      drillId: 'library-listening-1',
      questionId: 'library-listening-1-question-1',
    });
    expect(JSON.stringify(response.body)).not.toContain('correctOptionId');
  });

  it('scores a valid answer and replays the finalized outcome', async () => {
    const auth = { Authorization: 'Bearer local.signed.token' };
    const body = {
      questionId: 'library-listening-1-question-1',
      selectedOptionId: 'option-a',
    };
    const first = await request(app.getHttpServer())
      .post('/api/v1/library/items/player-version/drill/submit')
      .set(auth)
      .send(body)
      .expect(201);
    const second = await request(app.getHttpServer())
      .post('/api/v1/library/items/player-version/drill/submit')
      .set(auth)
      .send({ ...body, selectedOptionId: 'option-b' })
      .expect(201);
    expect(first.body.data).toMatchObject({
      isCorrect: true,
      score: 1,
      selectedOptionId: 'option-a',
    });
    expect(second.body.data).toEqual(first.body.data);
  });

  it('rejects an option not present in the server projection', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/library/items/player-version/drill/submit')
      .set('Authorization', 'Bearer local.signed.token')
      .send({
        questionId: 'library-listening-1-question-1',
        selectedOptionId: 'option-d',
      })
      .expect(400);
  });
});
