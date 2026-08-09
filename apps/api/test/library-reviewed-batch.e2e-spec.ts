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
import { PrismaService } from '../src/prisma/prisma.service';

describe('Reviewed licensed library batch API (e2e)', () => {
  let app: INestApplication<App>;
  const externalIdentity = createExternalIdentity({
    provider: 'SUPABASE',
    subject: 'reviewed-batch-learner',
    issuer: 'issuer',
    audience: 'audience',
  });
  const principal = createApplicationPrincipal({
    applicationUserId: 'reviewed-batch-user',
    externalIdentity,
    roles: ['FREE_USER'],
    ownerships: [],
    entitlements: [],
  });

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
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
  });

  it('serves only the approved local batch and redacts operator evidence', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/library/catalogue?page=1&size=12')
      .set('Authorization', 'Bearer local.signed.token')
      .set('X-Correlation-Id', 'reviewed-batch-001')
      .expect(200);

    expect(response.body).toMatchObject({
      data: {
        status: 'success',
        items: [
          { itemId: 'licensed-listening-1' },
          { itemId: 'licensed-listening-2' },
        ],
        pagination: { page: 1, size: 12, total: 2, pages: 1 },
      },
      meta: { correlationId: 'reviewed-batch-001' },
    });
    expect(JSON.stringify(response.body)).not.toContain('local-reviewed-audio');
    expect(JSON.stringify(response.body)).not.toContain('reviewEvidence');
    expect(JSON.stringify(response.body)).not.toContain(
      'approved local fixture',
    );
  });

  it('serves a safe item projection with controlled media state', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/library/items/licensed-listening-1-v1')
      .set('Authorization', 'Bearer local.signed.token')
      .expect(200);

    const body = response.body as {
      data: {
        itemId: string;
        versionId: string;
        media: { state: string };
        transcript: readonly { text: string }[];
      };
    };
    expect(body.data).toMatchObject({
      itemId: 'licensed-listening-1',
      versionId: 'licensed-listening-1-v1',
      media: { state: 'AVAILABLE' },
      transcript: [
        {
          text: 'Let us capture the action items before we close.',
        },
      ],
    });
    expect(JSON.stringify(response.body)).not.toContain('local-reviewed-audio');
    expect(JSON.stringify(response.body)).not.toContain('sha256:licensed');
  });
});
