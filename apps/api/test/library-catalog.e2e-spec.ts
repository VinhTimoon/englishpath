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
import { PrismaService } from '../src/prisma/prisma.service';

const record: LibraryCatalogueRecord = {
  version: {
    contentId: 'content-1',
    versionId: 'version-1',
    createdByActorId: 'editor-1',
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
      sourceId: 'englishpath-original',
      sourceUrl: 'https://private.example/drive-file',
      checksum: 'private-checksum',
      sourceVersion: 'private-source-version',
    },
    rights: {
      owner: 'private-rights-owner',
      licenseStatus: 'approved',
      allowedUsageScopes: ['library'],
      allowedAccessTiers: ['authenticated'],
      validUntil: '2027-01-01T00:00:00.000Z',
    },
    reviewStatus: 'approved',
    publishStatus: 'published',
  },
  title: 'Workplace dialogue',
  summary: 'A safe learner lesson',
  contentType: 'listening',
  durationMinutes: 8,
};

describe('Library catalogue API (e2e)', () => {
  let app: INestApplication<App>;
  const port: jest.Mocked<{
    load: () => Promise<readonly LibraryCatalogueRecord[]>;
  }> = {
    load: jest.fn(),
  };
  const externalIdentity = createExternalIdentity({
    provider: 'SUPABASE',
    subject: 'library-learner-subject',
    issuer: 'issuer',
    audience: 'audience',
  });
  const principal = createApplicationPrincipal({
    applicationUserId: 'library-learner-1',
    externalIdentity,
    roles: ['FREE_USER'],
    ownerships: [],
    entitlements: [],
  });

  beforeEach(async () => {
    port.load.mockResolvedValue([record]);
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(LIBRARY_CATALOGUE_PORT)
      .useValue(port)
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

  it('requires authentication and returns a safe eligible projection', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/library/catalogue')
      .expect(401);

    const response = await request(app.getHttpServer())
      .get('/api/v1/library/catalogue?page=1&size=12')
      .set('Authorization', 'Bearer local.signed.token')
      .set('X-Correlation-Id', 'library-catalogue-001')
      .expect(200);

    expect(response.body).toMatchObject({
      data: {
        status: 'success',
        items: [
          {
            itemId: 'content-1',
            title: 'Workplace dialogue',
            taxonomy: { level: 'B1', topic: 'Workplace' },
          },
        ],
      },
      meta: {
        correlationId: 'library-catalogue-001',
        idempotencyStatus: 'not_applicable',
      },
    });
    expect(JSON.stringify(response.body)).not.toContain('private.example');
    expect(JSON.stringify(response.body)).not.toContain('private-checksum');
    expect(JSON.stringify(response.body)).not.toContain('private-rights-owner');
  });

  it('rejects unknown fields and sanitizes adapter failures', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/library/catalogue?unknown=true')
      .set('Authorization', 'Bearer local.signed.token')
      .expect(400);

    port.load.mockRejectedValue(new Error('private provider detail'));
    const response = await request(app.getHttpServer())
      .get('/api/v1/library/catalogue')
      .set('Authorization', 'Bearer local.signed.token')
      .expect(503);
    expect(
      (response.body as { error: { message: string } }).error.message,
    ).toBe('Library catalogue unavailable.');
    expect(JSON.stringify(response.body)).not.toContain(
      'private provider detail',
    );
  });
});
