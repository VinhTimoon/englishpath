/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
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
  title: 'Player lesson',
  summary: 'Safe lesson',
  contentType: 'listening',
  durationSeconds: 60,
  transcript: [{ startSeconds: 0, endSeconds: 5, text: 'First line' }],
  storage: { provider: 'local', objectKey: 'private-object', state: 'PENDING' },
} as const;

describe('Library player state API (e2e)', () => {
  let app: INestApplication<App>;
  let progress: Record<string, any>;
  let bookmarks: Array<{
    userId: string;
    contentVersionId: string;
    timestampSeconds: number;
  }>;
  let notes: Record<string, { body: string; updatedAt: Date }>;
  const catalogue = { load: jest.fn() };
  const media = { resolve: jest.fn() };
  const principal = createApplicationPrincipal({
    applicationUserId: 'player-learner',
    externalIdentity: createExternalIdentity({
      provider: 'SUPABASE',
      subject: 'player-subject',
      issuer: 'issuer',
      audience: 'audience',
    }),
    roles: ['FREE_USER'],
    ownerships: [],
    entitlements: [],
  });
  const prisma = {
    libraryLearningProgress: {
      findUnique: jest.fn(({ where }: any) =>
        Promise.resolve(
          progress[
            `${where.userId_contentVersionId.userId}:${where.userId_contentVersionId.contentVersionId}`
          ] ?? null,
        ),
      ),
      upsert: jest.fn(({ where, create, update }: any) => {
        const key = `${where.userId_contentVersionId.userId}:${where.userId_contentVersionId.contentVersionId}`;
        const current = progress[key];
        const next = {
          ...(current ?? create),
          ...update,
          version: current ? current.version + 1 : 1,
          updatedAt: new Date('2026-01-01'),
        };
        progress[key] = next;
        return Promise.resolve(next);
      }),
    },
    libraryBookmark: {
      findMany: jest.fn(({ where }: any) =>
        Promise.resolve(
          bookmarks
            .filter(
              (row) =>
                row.userId === where.userId &&
                row.contentVersionId === where.contentVersionId,
            )
            .map((row) => ({ ...row, id: 'private-id' })),
        ),
      ),
      upsert: jest.fn(({ create }: any) => {
        const existing = bookmarks.find(
          (row) =>
            row.userId === create.userId &&
            row.contentVersionId === create.contentVersionId &&
            row.timestampSeconds === create.timestampSeconds,
        );
        if (!existing) bookmarks.push(create);
        return Promise.resolve(existing ?? create);
      }),
      deleteMany: jest.fn(({ where }: any) => {
        bookmarks = bookmarks.filter(
          (row) =>
            !(
              row.userId === where.userId &&
              row.contentVersionId === where.contentVersionId &&
              row.timestampSeconds === where.timestampSeconds
            ),
        );
        return Promise.resolve({ count: 1 });
      }),
    },
    libraryPersonalNote: {
      findUnique: jest.fn(({ where }: any) =>
        Promise.resolve(
          notes[
            `${where.userId_contentVersionId.userId}:${where.userId_contentVersionId.contentVersionId}`
          ] ?? null,
        ),
      ),
      upsert: jest.fn(({ where, create, update }: any) => {
        const key = `${where.userId_contentVersionId.userId}:${where.userId_contentVersionId.contentVersionId}`;
        const next = {
          ...(notes[key] ?? create),
          ...update,
          updatedAt: new Date('2026-01-01'),
        };
        notes[key] = next;
        return Promise.resolve(next);
      }),
      deleteMany: jest.fn(({ where }: any) => {
        delete notes[`${where.userId}:${where.contentVersionId}`];
        return Promise.resolve({ count: 1 });
      }),
    },
  };

  beforeEach(async () => {
    progress = {};
    bookmarks = [];
    notes = {};
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

  it('requires authentication and returns safe owner state', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/library/items/player-version/state')
      .expect(401);
    const response = await request(app.getHttpServer())
      .get('/api/v1/library/items/player-version/state')
      .set('Authorization', 'Bearer local.signed.token')
      .expect(200);
    expect(response.body.data).toMatchObject({
      item: { versionId: 'player-version', media: { state: 'PENDING' } },
      progress: null,
      bookmarks: [],
      note: null,
    });
    expect(JSON.stringify(response.body)).not.toContain('private-');
  });

  it('persists bounded progress, bookmark, and note writes idempotently', async () => {
    const auth = { Authorization: 'Bearer local.signed.token' };
    await request(app.getHttpServer())
      .put('/api/v1/library/items/player-version/progress')
      .set(auth)
      .send({ status: 'in_progress', positionSeconds: 12 })
      .expect(200);
    await request(app.getHttpServer())
      .put('/api/v1/library/items/player-version/progress')
      .set(auth)
      .send({ status: 'in_progress', positionSeconds: 12 })
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/library/items/player-version/bookmarks')
      .set(auth)
      .send({ timestampSeconds: 12 })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/library/items/player-version/bookmarks')
      .set(auth)
      .send({ timestampSeconds: 12 })
      .expect(201);
    await request(app.getHttpServer())
      .put('/api/v1/library/items/player-version/note')
      .set(auth)
      .send({ body: 'private note' })
      .expect(200);
    const state = await request(app.getHttpServer())
      .get('/api/v1/library/items/player-version/state')
      .set(auth)
      .expect(200);
    expect(state.body.data).toMatchObject({
      progress: { positionSeconds: 12, status: 'in_progress' },
      bookmarks: [{ timestampSeconds: 12 }],
      note: { body: 'private note' },
    });
  });

  it('rejects out-of-bounds completion and unsafe notes', async () => {
    const auth = { Authorization: 'Bearer local.signed.token' };
    await request(app.getHttpServer())
      .put('/api/v1/library/items/player-version/progress')
      .set(auth)
      .send({ status: 'completed', positionSeconds: 59 })
      .expect(400);
    await request(app.getHttpServer())
      .put('/api/v1/library/items/player-version/note')
      .set(auth)
      .send({ body: 'bad\u0000note' })
      .expect(400);
  });
});
