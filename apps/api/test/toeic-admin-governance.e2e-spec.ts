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
import { AuditService } from '../src/modules/audit/audit.service';
import type {
  ToeicAdminRecord,
  ToeicAdminRepository,
} from '../src/modules/toeic/toeic-admin.models';
import { TOEIC_ADMIN_REPOSITORY } from '../src/modules/toeic/toeic-admin.models';
import { PrismaService } from '../src/prisma/prisma.service';

const externalIdentity = createExternalIdentity({
  provider: 'SUPABASE',
  subject: 'toeic-admin-subject',
  issuer: 'issuer',
  audience: 'audience',
});

function makePrincipal(roles: string[], applicationUserId?: string) {
  return createApplicationPrincipal({
    applicationUserId:
      applicationUserId ?? (roles.includes('ADMIN') ? 'admin-1' : 'editor-1'),
    externalIdentity,
    roles,
    ownerships: [],
    entitlements: [],
  });
}

const importPayload = {
  questionId: 'question-1',
  version: 1,
  part: 'PART_5',
  questionType: 'INCOMPLETE_SENTENCE',
  difficulty: 'INTERMEDIATE',
  topic: 'workplace',
  prompt: 'Choose the correct option.',
  options: [
    { id: 'A', text: 'Option A' },
    { id: 'B', text: 'Option B' },
  ],
  explanation: 'Explanation',
  correctAnswer: 'A',
  sourceIdentity: 'englishpath-original',
  sourceUrl: 'https://englishpath.example/content/toeic',
  checksum: '5d8625a89136ac003512c7eee416516544bc722f8e68b4a3ff06deb140be8e3f',
  sourceVersion: '2026-08',
  provenance: 'CC0-1.0',
  rightsOwner: 'EnglishPath',
  licenseStatus: 'APPROVED',
  allowedUsageScopes: ['PRACTICE'],
  accessTier: 'FREE',
  validUntil: '2030-01-01T00:00:00.000Z',
};

function row(overrides: Partial<ToeicAdminRecord> = {}): ToeicAdminRecord {
  return {
    id: 'version-1',
    questionId: 'question-1',
    version: 1,
    previousVersionId: null,
    importIdentity: 'editor-1:idem-ep2-003',
    part: 'PART_5',
    questionType: 'INCOMPLETE_SENTENCE',
    difficulty: 'INTERMEDIATE',
    topic: 'workplace',
    stimulusGroup: null,
    prompt: importPayload.prompt,
    options: importPayload.options,
    mediaReference: null,
    explanation: 'Explanation',
    correctAnswer: 'A',
    sourceIdentity: 'englishpath-original',
    sourceUrl: 'https://englishpath.example/content/toeic',
    checksum: importPayload.checksum,
    sourceVersion: importPayload.sourceVersion,
    provenance: 'CC0-1.0',
    rightsOwner: 'EnglishPath',
    licenseStatus: 'APPROVED',
    allowedUsageScopes: ['PRACTICE'],
    accessTier: 'FREE',
    reviewStatus: 'DRAFT',
    reviewDecision: null,
    reviewEvidence: null,
    reviewerIdentity: null,
    reviewedAt: null,
    publicationState: 'UNPUBLISHED',
    publishedAt: null,
    validUntil: new Date('2030-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('TOEIC admin governance API (e2e)', () => {
  let app: INestApplication<App>;
  let currentPrincipal = makePrincipal(['CONTENT_EDITOR']);
  const repository: jest.Mocked<ToeicAdminRepository> = {
    findByImportIdentity: jest.fn(),
    findByVersionId: jest.fn(),
    findByQuestionVersion: jest.fn(),
    findBySourceVersion: jest.fn(),
    create: jest.fn(),
    review: jest.fn(),
    publish: jest.fn(),
  };
  const audit = { append: jest.fn().mockResolvedValue({}) };

  beforeEach(async () => {
    currentPrincipal = makePrincipal(['CONTENT_EDITOR']);
    repository.findByImportIdentity.mockResolvedValue(null);
    repository.findByQuestionVersion.mockResolvedValue(null);
    repository.findBySourceVersion.mockResolvedValue(null);
    repository.findByVersionId.mockResolvedValue(row());
    repository.create.mockResolvedValue(row());
    repository.review.mockResolvedValue(
      row({ reviewStatus: 'REVIEWED', reviewDecision: 'APPROVE' }),
    );
    repository.publish.mockResolvedValue(
      row({ publicationState: 'PUBLISHED' }),
    );
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(TOEIC_ADMIN_REPOSITORY)
      .useValue(repository)
      .overrideProvider(AuditService)
      .useValue(audit)
      .overrideProvider(EXTERNAL_IDENTITY_VERIFIER)
      .useValue({ verify: jest.fn().mockResolvedValue(externalIdentity) })
      .overrideProvider(APPLICATION_PRINCIPAL_RESOLVER)
      .useValue({
        resolve: jest.fn().mockImplementation(() => currentPrincipal),
      })
      .compile();
    app = moduleFixture.createNestApplication();
    configureOpenApi(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it('requires authentication and keeps imported governance fields out of the response', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/toeic/admin/question-versions/import')
      .send(importPayload)
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/v1/toeic/admin/question-versions/import')
      .set('Authorization', 'Bearer local.signed.token')
      .send(importPayload)
      .expect(400);

    const response = await request(app.getHttpServer())
      .post('/api/v1/toeic/admin/question-versions/import')
      .set('Authorization', 'Bearer local.signed.token')
      .set('X-Correlation-Id', 'toeic-admin-001')
      .set('Idempotency-Key', 'idem-ep2-003')
      .send(importPayload)
      .expect(201);

    expect(response.body).toMatchObject({
      data: {
        id: 'version-1',
        reviewStatus: 'DRAFT',
        publicationState: 'UNPUBLISHED',
      },
      meta: { correlationId: 'toeic-admin-001', idempotencyStatus: 'created' },
    });
    expect(JSON.stringify(response.body)).not.toContain('correctAnswer');
    expect(JSON.stringify(response.body)).not.toContain('rightsOwner');
    expect(JSON.stringify(response.body)).not.toContain('sourceUrl');
  });

  it('audits and denies publish for a content editor', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/toeic/admin/question-versions/version-1/publish')
      .set('Authorization', 'Bearer local.signed.token')
      .send({
        checksum: importPayload.checksum,
        sourceVersion: importPayload.sourceVersion,
      })
      .expect(403);

    const errorBody = response.body as {
      error: { code: string; message: string; details: unknown[] };
    };
    expect(errorBody.error).toEqual({
      code: 'RESOURCE_FORBIDDEN',
      message: 'Access is forbidden.',
      details: [],
    });
    expect(JSON.stringify(errorBody)).not.toContain('correctAnswer');
    expect(JSON.stringify(errorBody)).not.toContain('sourceUrl');
    expect(JSON.stringify(errorBody)).not.toContain('rightsOwner');
    expect(audit.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'toeic.question.publish',
        policyResult: 'DENY',
      }),
    );
  });

  it('supports review then publish with separate roles and stable metadata', async () => {
    currentPrincipal = makePrincipal(['CONTENT_EDITOR'], 'reviewer-1');
    const review = await request(app.getHttpServer())
      .post('/api/v1/toeic/admin/question-versions/version-1/review')
      .set('Authorization', 'Bearer local.signed.token')
      .set('X-Correlation-Id', 'toeic-admin-002')
      .send({
        decision: 'APPROVE',
        checksum: importPayload.checksum,
        sourceVersion: importPayload.sourceVersion,
      })
      .expect(201);
    const reviewBody = review.body as {
      meta: { correlationId: string; idempotencyStatus: string };
    };
    expect(reviewBody.meta).toEqual({
      correlationId: 'toeic-admin-002',
      idempotencyStatus: 'not_applicable',
    });

    currentPrincipal = makePrincipal(['ADMIN']);
    repository.findByVersionId.mockResolvedValue(
      row({
        reviewStatus: 'REVIEWED',
        reviewDecision: 'APPROVE',
        reviewEvidence: JSON.stringify({
          questionId: 'question-1',
          versionId: 'version-1',
          version: 1,
          checksum: importPayload.checksum,
          sourceVersion: importPayload.sourceVersion,
          reviewerId: 'reviewer-1',
          reviewedAt: '2026-08-06T12:00:00.000Z',
        }),
        reviewerIdentity: 'reviewer-1',
        reviewedAt: new Date('2026-08-06T12:00:00.000Z'),
      }),
    );
    const publish = await request(app.getHttpServer())
      .post('/api/v1/toeic/admin/question-versions/version-1/publish')
      .set('Authorization', 'Bearer local.signed.token')
      .send({
        checksum: importPayload.checksum,
        sourceVersion: importPayload.sourceVersion,
      })
      .expect(201);
    const publishBody = publish.body as {
      data: { publicationState: string };
    };
    expect(publishBody.data.publicationState).toBe('PUBLISHED');
    expect(JSON.stringify(publish.body)).not.toContain('correctAnswer');
    expect(JSON.stringify(publish.body)).not.toContain('sourceUrl');
    expect(JSON.stringify(publish.body)).not.toContain('rightsOwner');
    expect(JSON.stringify(publish.body)).not.toContain('reviewEvidence');
  });
});
