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
    contentId: 'shadow-content',
    versionId: 'shadow-version',
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
  title: 'Shadowing lesson',
  summary: 'Safe shadowing lesson',
  contentType: 'listening',
  durationSeconds: 30,
  transcript: [
    { startSeconds: 0, endSeconds: 10, text: 'Repeat this sentence', order: 0 },
  ],
  storage: { provider: 'local', objectKey: 'private-object', state: 'PENDING' },
} as const;

describe('Library shadowing API (e2e)', () => {
  let app: INestApplication<App>;
  let attempt: Record<string, any> | null;
  const catalogue = { load: jest.fn() };
  const media = { resolve: jest.fn() };
  const principal = createApplicationPrincipal({
    applicationUserId: 'shadow-learner',
    externalIdentity: createExternalIdentity({
      provider: 'SUPABASE',
      subject: 'shadow-subject',
      issuer: 'issuer',
      audience: 'audience',
    }),
    roles: ['FREE_USER'],
    ownerships: [],
    entitlements: [],
  });
  const prisma = {
    libraryShadowingAttempt: {
      findFirst: jest.fn(({ where }: any) =>
        Promise.resolve(
          attempt &&
            attempt.userId === where.userId &&
            attempt.contentVersionId === where.contentVersionId
            ? attempt
            : null,
        ),
      ),
      findMany: jest.fn(({ where }: any) =>
        Promise.resolve(
          attempt &&
            attempt.userId === where.userId &&
            attempt.contentVersionId === where.contentVersionId
            ? [attempt]
            : [],
        ),
      ),
      create: jest.fn(({ data }: any) => {
        attempt = {
          id: 'attempt-id',
          attemptKey: 'attempt-key',
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
          finalizedAt:
            data.status === 'FINALIZED' ? new Date('2026-01-01') : null,
          ...data,
        };
        return Promise.resolve(attempt);
      }),
      update: jest.fn(({ data }: any) => {
        attempt = { ...attempt, ...data, updatedAt: new Date('2026-01-02') };
        return Promise.resolve(attempt);
      }),
    },
  };

  beforeEach(async () => {
    attempt = null;
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

  it('requires auth and returns safe shadowing state', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/library/items/shadow-version/shadowing')
      .expect(401);
    const response = await request(app.getHttpServer())
      .get('/api/v1/library/items/shadow-version/shadowing')
      .set('Authorization', 'Bearer local.signed.token')
      .expect(200);
    expect(response.body.data.item.transcript).toHaveLength(1);
    expect(JSON.stringify(response.body)).not.toContain('private-source');
    expect(JSON.stringify(response.body)).not.toContain('objectKey');
  });

  it('persists progress, finalizes it, and replays the finalized result', async () => {
    const auth = { Authorization: 'Bearer local.signed.token' };
    await request(app.getHttpServer())
      .put('/api/v1/library/items/shadow-version/shadowing')
      .set(auth)
      .send({
        segmentIndex: 0,
        positionSeconds: 4,
        status: 'paused',
        selfRating: 4,
      })
      .expect(200);
    const first = await request(app.getHttpServer())
      .post('/api/v1/library/items/shadow-version/shadowing/finalize')
      .set(auth)
      .send({ segmentIndex: 0, positionSeconds: 10, selfRating: 5 })
      .expect(201);
    const second = await request(app.getHttpServer())
      .post('/api/v1/library/items/shadow-version/shadowing/finalize')
      .set(auth)
      .send({ segmentIndex: 0, positionSeconds: 1, selfRating: 1 })
      .expect(201);
    expect(first.body.data).toMatchObject({
      status: 'finalized',
      selfRating: 5,
    });
    expect(second.body.data).toEqual(first.body.data);
  });

  it('rejects invalid segment, rating, and unknown fields', async () => {
    const auth = { Authorization: 'Bearer local.signed.token' };
    await request(app.getHttpServer())
      .put('/api/v1/library/items/shadow-version/shadowing')
      .set(auth)
      .send({ segmentIndex: 4, positionSeconds: 1, status: 'paused' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/library/items/shadow-version/shadowing/finalize')
      .set(auth)
      .send({
        segmentIndex: 0,
        positionSeconds: 1,
        selfRating: 6,
        audio: 'blob',
      })
      .expect(400);
  });
});
