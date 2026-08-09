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
import {
  LIBRARY_CATALOGUE_PORT,
  type LibraryCatalogueRecord,
} from '../src/modules/library/library-catalogue.port';
import { CONTROLLED_MEDIA_PORT } from '../src/modules/library/library-content.ports';
import { PrismaService } from '../src/prisma/prisma.service';

const record: LibraryCatalogueRecord = {
  version: {
    contentId: 'content-media',
    versionId: 'version-media',
    createdByActorId: 'private-actor',
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
      sourceUrl: 'https://private.example/drive',
      checksum: 'private-checksum',
      sourceVersion: 'private-version',
    },
    rights: {
      owner: 'private-owner',
      licenseStatus: 'approved',
      allowedUsageScopes: ['library'],
      allowedAccessTiers: ['authenticated'],
      validUntil: '2027-01-01T00:00:00.000Z',
    },
    reviewStatus: 'approved',
    publishStatus: 'published',
  },
  title: 'Workplace dialogue',
  summary: 'A safe transcript lesson',
  contentType: 'listening',
  durationSeconds: 60,
  transcript: [
    { startSeconds: 12, endSeconds: 16, text: 'Second line', order: 2 },
    { startSeconds: 0, endSeconds: 4, text: 'First line', order: 1 },
  ],
  storage: {
    provider: 'private-provider',
    objectKey: 'private-object',
    state: 'AVAILABLE',
  },
};

describe('Library media API (e2e)', () => {
  let app: INestApplication<App>;
  const catalogue = { load: jest.fn() };
  const media = { resolve: jest.fn() };
  const externalIdentity = createExternalIdentity({
    provider: 'SUPABASE',
    subject: 'library-media-subject',
    issuer: 'issuer',
    audience: 'audience',
  });
  const principal = createApplicationPrincipal({
    applicationUserId: 'library-media-learner',
    externalIdentity,
    roles: ['FREE_USER'],
    ownerships: [],
    entitlements: [],
  });

  beforeEach(async () => {
    catalogue.load.mockResolvedValue([record]);
    media.resolve.mockResolvedValue({ state: 'AVAILABLE' });
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(LIBRARY_CATALOGUE_PORT)
      .useValue(catalogue)
      .overrideProvider(CONTROLLED_MEDIA_PORT)
      .useValue(media)
      .overrideProvider(EXTERNAL_IDENTITY_VERIFIER)
      .useValue({ verify: jest.fn().mockResolvedValue(externalIdentity) })
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

  it('requires authentication and returns safe ordered transcript/media state', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/library/items/version-media')
      .expect(401);

    const response = await request(app.getHttpServer())
      .get('/api/v1/library/items/version-media')
      .set('Authorization', 'Bearer local.signed.token')
      .set('X-Correlation-Id', 'library-media-001')
      .expect(200);
    expect(response.body).toMatchObject({
      data: {
        itemId: 'content-media',
        media: { state: 'AVAILABLE' },
        transcript: [
          { startSeconds: 0, text: 'First line' },
          { startSeconds: 12, text: 'Second line' },
        ],
      },
      meta: { correlationId: 'library-media-001' },
    });
    expect(JSON.stringify(response.body)).not.toContain('private-');
    expect(JSON.stringify(response.body)).not.toContain('https://');
    expect(JSON.stringify(response.body)).not.toContain('locator');
  });

  it('does not reveal ineligible versus unknown versions', async () => {
    const unknown = await request(app.getHttpServer())
      .get('/api/v1/library/items/missing-version')
      .set('Authorization', 'Bearer local.signed.token')
      .set('X-Correlation-Id', 'library-media-404')
      .expect(404);
    catalogue.load.mockResolvedValue([
      { ...record, version: { ...record.version, publishStatus: 'draft' } },
    ]);
    const ineligible = await request(app.getHttpServer())
      .get('/api/v1/library/items/version-media')
      .set('Authorization', 'Bearer local.signed.token')
      .set('X-Correlation-Id', 'library-media-404')
      .expect(404);
    expect(ineligible.body).toEqual(unknown.body);
  });

  it('sanitizes provider failure and all non-playable states', async () => {
    type MediaResponse = { data: { media: { state: string } } };
    media.resolve.mockRejectedValue(new Error('private provider locator'));
    const failed = await request(app.getHttpServer())
      .get('/api/v1/library/items/version-media')
      .set('Authorization', 'Bearer local.signed.token')
      .expect(200);
    expect((failed.body as MediaResponse).data.media).toEqual({
      state: 'PENDING',
    });
    expect(JSON.stringify(failed.body)).not.toContain(
      'private provider locator',
    );

    for (const state of ['PENDING', 'QUARANTINED', 'RETIRED']) {
      media.resolve.mockResolvedValue({ state });
      const response = await request(app.getHttpServer())
        .get('/api/v1/library/items/version-media')
        .set('Authorization', 'Bearer local.signed.token')
        .expect(200);
      expect((response.body as MediaResponse).data.media).toEqual({ state });
      expect((response.body as MediaResponse).data.media).not.toHaveProperty(
        'locator',
      );
    }
  });

  it('rejects malformed transcript data without leaking its contents', async () => {
    catalogue.load.mockResolvedValue([
      {
        ...record,
        transcript: [
          { startSeconds: 8, endSeconds: 2, text: 'private bad text' },
        ],
      },
    ]);
    const response = await request(app.getHttpServer())
      .get('/api/v1/library/items/version-media')
      .set('Authorization', 'Bearer local.signed.token')
      .expect(400);
    expect(JSON.stringify(response.body)).not.toContain('private bad text');
  });
});
