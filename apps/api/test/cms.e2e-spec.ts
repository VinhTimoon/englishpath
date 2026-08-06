import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  APPLICATION_PRINCIPAL_RESOLVER,
  EXTERNAL_IDENTITY_VERIFIER,
} from '../src/modules/auth/auth.tokens';
import {
  createApplicationPrincipal,
  createExternalIdentity,
} from '../src/modules/access';
import { configureOpenApi } from '../src/config/openapi';

type CmsResponse = { meta: { idempotencyStatus: string } };

describe('CMS API (e2e)', () => {
  let app: INestApplication<App>;
  let storedVersion: Record<string, unknown> | undefined;
  const externalIdentity = createExternalIdentity({
    provider: 'SUPABASE',
    subject: 'cms-editor-subject',
    issuer: 'issuer',
    audience: 'audience',
  });
  const principal = createApplicationPrincipal({
    applicationUserId: 'cms-editor-1',
    externalIdentity,
    roles: ['CONTENT_EDITOR'],
    ownerships: [],
    entitlements: [],
  });
  const taxonomy = {
    id: 'workplace',
    parentId: null,
    level: 'B1',
    topic: 'Workplace English',
    subtopic: null,
    collocations: [],
    relatedSkills: ['Listening'],
    tracks: ['workplace'],
    toeicParts: [2],
  };
  const contentVersionCreateMock = jest.fn();
  const prisma = {
    $transaction: jest.fn((callback: (client: unknown) => unknown) =>
      callback(prisma),
    ),
    privilegedAuditEvent: {
      create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    },
    cmsTaxonomyNode: {
      findUnique: jest.fn().mockResolvedValue(taxonomy),
      findMany: jest.fn().mockResolvedValue([taxonomy]),
      count: jest.fn().mockResolvedValue(1),
      create: jest
        .fn()
        .mockImplementation((args: { data: typeof taxonomy }) => args.data),
    },
    cmsContent: { upsert: jest.fn().mockResolvedValue({ id: 'content-1' }) },
    cmsContentVersion: {
      findUnique: jest
        .fn()
        .mockImplementation((args: { where: Record<string, unknown> }) => {
          if ('id' in args.where) return storedVersion;
          return storedVersion;
        }),
      create: contentVersionCreateMock.mockImplementation(
        (args: { data: Record<string, unknown> }) => {
          storedVersion = {
            ...args.data,
            previousVersionId: null,
            sourceUrl: 'https://private.example/source',
            validUntil: new Date('2027-01-01T00:00:00.000Z'),
            reviewStatus: 'draft',
            publishStatus: 'draft',
            reviewDecision: null,
            reviewerId: null,
            reviewedAt: null,
            reviewContentId: null,
            reviewVersionId: null,
            reviewChecksum: null,
            reviewSourceVersion: null,
            publishedAt: null,
          };
          return storedVersion;
        },
      ),
      update: jest
        .fn()
        .mockImplementation((args: { data: Record<string, unknown> }) => {
          storedVersion = { ...storedVersion, ...args.data };
          return storedVersion;
        }),
    },
  };

  beforeEach(async () => {
    storedVersion = undefined;
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
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

  it('protects CMS routes, rejects unknown fields, and replays draft creation', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/cms/taxonomy/nodes')
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/v1/cms/taxonomy/nodes')
      .set('Authorization', 'Bearer local.signed.token')
      .send({ ...taxonomy, unknown: true })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/cms/taxonomy/nodes')
      .set('Authorization', 'Bearer local.signed.token')
      .set('X-Correlation-Id', 'cms-taxonomy-001')
      .send(taxonomy)
      .expect(201);

    const payload = {
      contentId: 'content-1',
      versionId: 'version-1',
      clientRequestId: 'request-1',
      contentType: 'lesson',
      title: 'Meeting vocabulary',
      body: 'A short lesson.',
      provenance: 'imported',
      usageScope: 'learning',
      accessTier: 'authenticated',
      taxonomyNodeId: 'workplace',
      sourceId: 'drive-file-1',
      sourceUrl: 'https://private.example/source',
      checksum: 'sha256:version1',
      sourceVersion: 'drive-v1',
      rightsOwner: 'Private Rights Owner',
      licenseStatus: 'approved',
      allowedUsageScopes: ['learning'],
      allowedAccessTiers: ['authenticated'],
      validUntil: '2027-01-01T00:00:00.000Z',
    };
    const first = await request(app.getHttpServer())
      .post('/api/v1/cms/content-versions')
      .set('Authorization', 'Bearer local.signed.token')
      .set('X-Correlation-Id', 'cms-content-001')
      .send(payload)
      .expect(201);
    expect((first.body as CmsResponse).meta.idempotencyStatus).toBe('created');
    expect(JSON.stringify(first.body)).not.toContain('private.example');
    expect(JSON.stringify(first.body)).not.toContain('Private Rights Owner');

    const replay = await request(app.getHttpServer())
      .post('/api/v1/cms/content-versions')
      .set('Authorization', 'Bearer local.signed.token')
      .set('X-Correlation-Id', 'cms-content-002')
      .send(payload)
      .expect(201);
    expect((replay.body as CmsResponse).meta.idempotencyStatus).toBe(
      'replayed',
    );
    expect(contentVersionCreateMock).toHaveBeenCalledTimes(1);
  });
});
