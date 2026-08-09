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
    contentId: 'links-content',
    versionId: 'links-version',
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
  title: 'Links lesson',
  summary: 'Safe related learning',
  contentType: 'listening',
  durationSeconds: 10,
  transcript: [],
  storage: { provider: 'local', objectKey: 'private-object', state: 'PENDING' },
} as const;

describe('Library related-learning links API (e2e)', () => {
  let app: INestApplication<App>;
  const catalogue = { load: jest.fn() };
  const media = { resolve: jest.fn() };
  const principal = createApplicationPrincipal({
    applicationUserId: 'links-learner',
    externalIdentity: createExternalIdentity({
      provider: 'SUPABASE',
      subject: 'links-subject',
      issuer: 'issuer',
      audience: 'audience',
    }),
    roles: ['FREE_USER'],
    ownerships: [],
    entitlements: [],
  });

  beforeEach(async () => {
    catalogue.load.mockResolvedValue([record]);
    media.resolve.mockResolvedValue({ state: 'PENDING' });
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

  it('requires auth and returns deterministic internal routes only', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/library/items/links-version/links')
      .expect(401);
    const response = await request(app.getHttpServer())
      .get('/api/v1/library/items/links-version/links')
      .set('Authorization', 'Bearer local.signed.token')
      .expect(200);
    const body = response.body as {
      data: { links: Array<{ kind: string; href: string }> };
    };
    expect(body.data.links.map((link) => link.kind)).toEqual([
      'roadmap',
      'vocabulary',
      'quiz',
    ]);
    for (const link of body.data.links) {
      expect(link.href).toMatch(
        /^\/(roadmap|vocabulary|daily-practice)\?returnVersionId=/u,
      );
      expect(link.href).not.toContain('private');
    }
  });

  it('fails closed for an unknown or withdrawn version', async () => {
    catalogue.load.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get('/api/v1/library/items/unknown/links')
      .set('Authorization', 'Bearer local.signed.token')
      .expect(404);
  });
});
