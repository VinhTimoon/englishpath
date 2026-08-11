import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureOpenApi } from '../src/config/openapi';
import {
  APPLICATION_PRINCIPAL_RESOLVER,
  EXTERNAL_IDENTITY_VERIFIER,
} from '../src/modules/auth/auth.tokens';
import {
  createApplicationPrincipal,
  createExternalIdentity,
} from '../src/modules/access';
import { PRACTICE_REPOSITORY } from '../src/modules/practice/practice.models';
import { PrismaService } from '../src/prisma/prisma.service';

type ApiBody = {
  data: {
    entries: readonly Record<string, unknown>[];
    pagination: Record<string, unknown>;
    coverage: { domains: readonly Record<string, unknown>[] };
  };
};
type OpenApiSchema = {
  type?: string;
  enum?: readonly string[];
  properties?: Record<string, OpenApiSchema>;
  items?: OpenApiSchema;
};
type OpenApiResponse = {
  paths: Record<
    string,
    {
      get: {
        responses: Record<
          string,
          { content: Record<string, { schema: OpenApiSchema }> }
        >;
      };
    }
  >;
};

const identity = createExternalIdentity({
  provider: 'SUPABASE',
  subject: 'practice-e2e-subject',
  issuer: 'issuer',
  audience: 'audience',
});
const learner = createApplicationPrincipal({
  applicationUserId: 'practice-learner-1',
  externalIdentity: identity,
  roles: ['FREE_USER'],
  ownerships: [],
  entitlements: [],
});
const alternateLearner = createApplicationPrincipal({
  applicationUserId: 'practice-learner-2',
  externalIdentity: { ...identity, subject: 'practice-e2e-subject-2' },
  roles: ['FREE_USER'],
  ownerships: [],
  entitlements: [],
});

function page(questionId: string, count: number) {
  return {
    entries: [
      {
        questionId,
        prompt: 'Safe prompt',
        selectedOption: 'B',
        correctOption: 'A',
        explanation: 'Safe explanation',
        source: 'PRACTICE' as const,
        remediation: { href: '/error-notebook', label: 'Xem lại lỗi' },
      },
    ],
    pagination: { page: 1, size: 20, total: count, hasNext: false },
    coverage: {
      domains: [
        {
          domain: 'GENERAL' as const,
          state: 'available' as const,
          entryCount: count,
        },
        {
          domain: 'LISTENING' as const,
          state: 'empty' as const,
          entryCount: 0,
        },
        { domain: 'READING' as const, state: 'empty' as const, entryCount: 0 },
        {
          domain: 'SPEAKING' as const,
          state: 'unavailable' as const,
          entryCount: 0,
        },
        {
          domain: 'WRITING' as const,
          state: 'unavailable' as const,
          entryCount: 0,
        },
      ],
    },
  };
}

describe('Error Notebook coverage API (e2e)', () => {
  let app: INestApplication<App>;
  let currentPrincipal = learner;
  const resolvePrincipal = jest.fn();
  const repository = {
    errors: jest.fn((userId: string) =>
      Promise.resolve(
        userId === learner.applicationUserId
          ? page('learner-one-error', 1)
          : page('learner-two-error', 1),
      ),
    ),
  };

  beforeEach(async () => {
    currentPrincipal = learner;
    resolvePrincipal.mockImplementation(() =>
      Promise.resolve(currentPrincipal),
    );
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(PRACTICE_REPOSITORY)
      .useValue(repository)
      .overrideProvider(EXTERNAL_IDENTITY_VERIFIER)
      .useValue({ verify: jest.fn().mockResolvedValue(identity) })
      .overrideProvider(APPLICATION_PRINCIPAL_RESOLVER)
      .useValue({ resolve: resolvePrincipal })
      .compile();
    app = moduleFixture.createNestApplication();
    configureOpenApi(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it('requires authentication and returns additive coverage without sensitive fields', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/quiz/session/summary/errors')
      .expect(401);

    const response = await request(app.getHttpServer())
      .get('/api/v1/quiz/session/summary/errors?source=TOEIC_TIMED_TEST')
      .set('Authorization', 'Bearer local.practice.token')
      .set('X-Correlation-Id', 'practice-coverage-001')
      .expect(200);
    const body = response.body as ApiBody;
    expect(body.data.coverage.domains.map((domain) => domain.domain)).toEqual([
      'GENERAL',
      'LISTENING',
      'READING',
      'SPEAKING',
      'WRITING',
    ]);
    expect(body.data.coverage.domains[0]).toEqual({
      domain: 'GENERAL',
      state: 'available',
      entryCount: 1,
    });
    expect(body.data.coverage.domains.at(-1)).toEqual({
      domain: 'WRITING',
      state: 'unavailable',
      entryCount: 0,
    });
    expect(repository.errors).toHaveBeenCalledWith(learner.applicationUserId, {
      page: 1,
      size: 20,
      source: 'TOEIC_TIMED_TEST',
    });
    expect(JSON.stringify(response.body)).not.toMatch(
      /userId|provider|rubric|submission|answerKey|correct_answer/i,
    );
  });

  it('publishes the additive coverage contract in OpenAPI', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);
    const schema = (response.body as OpenApiResponse).paths[
      '/api/v1/quiz/session/summary/errors'
    ].get.responses['200'].content['application/json'].schema;
    const domainProperties =
      schema.properties?.data?.properties?.coverage?.properties?.domains?.items
        ?.properties;
    expect(domainProperties?.domain?.enum).toEqual([
      'GENERAL',
      'LISTENING',
      'READING',
      'SPEAKING',
      'WRITING',
    ]);
    expect(domainProperties?.state?.enum).toEqual([
      'available',
      'empty',
      'unavailable',
    ]);
    expect(domainProperties?.entryCount?.type).toBe('integer');
  });

  it('passes the authenticated owner to the repository for every learner', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/quiz/session/summary/errors')
      .set('Authorization', 'Bearer local.practice.token')
      .expect(200);

    currentPrincipal = alternateLearner;
    const alternate = await request(app.getHttpServer())
      .get('/api/v1/quiz/session/summary/errors')
      .set('Authorization', 'Bearer local.practice.token')
      .expect(200);
    expect((alternate.body as ApiBody).data.entries[0]?.questionId).toBe(
      'learner-two-error',
    );
    expect(repository.errors).toHaveBeenLastCalledWith(
      alternateLearner.applicationUserId,
      { page: 1, size: 20 },
    );
  });
});
