import {
  ConflictException,
  INestApplication,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import {
  createApplicationPrincipal,
  createExternalIdentity,
} from '../src/modules/access';
import {
  APPLICATION_PRINCIPAL_RESOLVER,
  EXTERNAL_IDENTITY_VERIFIER,
} from '../src/modules/auth/auth.tokens';
import {
  TOEIC_WRITING_SUBMISSION_REPOSITORY,
  TOEIC_WRITING_TASK_CATALOGUE,
  type ToeicWritingSubmissionRepository,
  type ToeicWritingTaskCatalogue,
  type WritingSessionRecord,
  type WritingSubmissionRecord,
} from '../src/modules/toeic/toeic-writing-submission.models';
import { AiFeedbackGatewayService } from '../src/modules/ai-gateway/ai-feedback.service';
import { createTaskVersion } from '../src/modules/toeic/toeic-speaking-writing.models';
import { PrismaService } from '../src/prisma/prisma.service';

describe('TOEIC Writing submission vertical slice (e2e)', () => {
  let app: INestApplication<App>;
  const external = createExternalIdentity({
    provider: 'SUPABASE',
    subject: 'writing-e2e-user',
    issuer: 'issuer',
    audience: 'authenticated',
  });
  const principal = createApplicationPrincipal({
    applicationUserId: 'writing-e2e-owner',
    externalIdentity: external,
    roles: ['FREE_USER'],
    ownerships: [],
    entitlements: [],
  });
  const task = createTaskVersion({
    id: 'writing-e2e-task',
    skill: 'WRITING',
    taskType: 'SENTENCE_BASED',
    version: 'v1',
    promptKind: 'TEXT',
    responseMode: 'TEXT',
    instruction: 'Write clearly.',
    prompt: 'Describe a safe study habit.',
    minWords: 4,
    maxWords: 20,
    publicationState: 'PUBLISHED',
  });
  const repository: jest.Mocked<ToeicWritingSubmissionRepository> = {
    findSession: jest.fn(),
    findByStartIdempotency: jest.fn(),
    findSubmissionByIdempotency: jest.fn(),
    createSession: jest.fn(),
    finalizeWithSubmission: jest.fn(),
  };
  const catalogue: jest.Mocked<ToeicWritingTaskCatalogue> = {
    findPublished: jest.fn().mockResolvedValue(task),
  };
  const feedbackGateway = {
    request: jest.fn().mockResolvedValue({
      feedback: {
        outcome: 'ALLOWED',
        policyVersion: 'feedback-gateway-v1',
        promptVersion: 'local-fixture-v1',
        feature: 'WRITING',
        skill: 'WRITING',
        quotaRemaining: 9,
        feedback: {
          advisoryOnly: true,
          summary: 'A safe advisory summary.',
          strengths: ['The response is complete.'],
          nextSteps: ['Review word choice.'],
        },
      },
      replayed: false,
    }),
  };
  const activeSession = (): WritingSessionRecord => ({
    id: 'writing-session-e2e',
    userId: principal.applicationUserId,
    taskId: task.id,
    taskVersion: task.version,
    status: 'ACTIVE',
    startedAt: new Date('2026-08-10T00:00:00.000Z'),
    finalizedAt: null,
    submission: null,
  });
  const finalSubmission = (): WritingSubmissionRecord => ({
    id: 'writing-submission-e2e',
    sessionId: activeSession().id,
    userId: principal.applicationUserId,
    idempotencyKey: 'submit-writing-e2e',
    responseMode: 'TEXT',
    wordCount: 8,
    characterCount: 48,
    submittedText: 'Daily practice helps me learn English every morning.',
    submittedAt: new Date('2026-08-10T00:01:00.000Z'),
  });
  const finalizedSession = (): WritingSessionRecord => ({
    ...activeSession(),
    status: 'FINALIZED',
    finalizedAt: new Date('2026-08-10T00:01:00.000Z'),
    submission: finalSubmission(),
  });

  beforeEach(async () => {
    repository.findByStartIdempotency.mockResolvedValue(null);
    repository.findSession.mockResolvedValue(activeSession());
    repository.findSubmissionByIdempotency.mockResolvedValue(null);
    repository.createSession.mockResolvedValue(activeSession());
    repository.finalizeWithSubmission.mockResolvedValue({
      session: {
        ...activeSession(),
        status: 'FINALIZED',
        finalizedAt: new Date('2026-08-10T00:01:00.000Z'),
        submission: finalSubmission(),
      },
      created: true,
    });
    feedbackGateway.request.mockClear();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({ $queryRaw: jest.fn().mockResolvedValue([{ result: 1 }]) })
      .overrideProvider(EXTERNAL_IDENTITY_VERIFIER)
      .useValue({ verify: jest.fn().mockResolvedValue(external) })
      .overrideProvider(APPLICATION_PRINCIPAL_RESOLVER)
      .useValue({ resolve: jest.fn().mockResolvedValue(principal) })
      .overrideProvider(TOEIC_WRITING_SUBMISSION_REPOSITORY)
      .useValue(repository)
      .overrideProvider(TOEIC_WRITING_TASK_CATALOGUE)
      .useValue(catalogue)
      .overrideProvider(AiFeedbackGatewayService)
      .useValue(feedbackGateway)
      .compile();
    app = module.createNestApplication();
    await app.init();
  });

  it('starts and finalizes an owner-scoped safe Writing submission', async () => {
    const start = await request(app.getHttpServer())
      .post(`/api/v1/toeic/writing/tasks/${task.id}/sessions`)
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'start-writing-e2e')
      .expect(200);
    expect(
      (start.body as { data: { session: { task: { skill: string } } } }).data
        .session.task.skill,
    ).toBe('WRITING');
    const submit = await request(app.getHttpServer())
      .post(`/api/v1/toeic/writing/sessions/${activeSession().id}/submissions`)
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'submit-writing-e2e')
      .send({ text: 'Daily practice helps me learn English every morning.' })
      .expect(200);
    const body = submit.body as {
      data: {
        session: { status: string; submission: Record<string, unknown> };
      };
    };
    expect(body.data.session.status).toBe('FINALIZED');
    expect(body.data.session.submission).toEqual(
      expect.objectContaining({ wordCount: 8 }),
    );
    expect(JSON.stringify(submit.body)).not.toMatch(
      /submittedText|rubric|provider|score|answer/i,
    );
  });

  it('rejects missing keys, wrong bounds, and cross-owner sessions', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/toeic/writing/tasks/${task.id}/sessions`)
      .set('Authorization', 'Bearer local.token.value')
      .expect(400);
    await request(app.getHttpServer())
      .post(`/api/v1/toeic/writing/sessions/${activeSession().id}/submissions`)
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'submit-short')
      .send({ text: 'Too short.' })
      .expect(422);
    repository.findSession.mockResolvedValue(null);
    await request(app.getHttpServer())
      .get('/api/v1/toeic/writing/sessions/other-owner-session')
      .set('Authorization', 'Bearer local.token.value')
      .expect(404);
    expect(repository.findSession.mock.calls).toContainEqual([
      principal.applicationUserId,
      'other-owner-session',
    ]);
  });

  it('requests safe advisory feedback only for the owner finalized session', async () => {
    repository.findSession.mockResolvedValue(finalizedSession());
    const response = await request(app.getHttpServer())
      .post(`/api/v1/toeic/writing/sessions/${finalizedSession().id}/feedback`)
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'feedback-writing-e2e')
      .expect(200);
    const body = response.body as {
      data: { feedback: { feedback: { advisoryOnly: boolean } } };
    };
    expect(body.data.feedback.feedback).toEqual(
      expect.objectContaining({ advisoryOnly: true }),
    );
    expect(feedbackGateway.request.mock.calls).toContainEqual([
      principal,
      expect.objectContaining({
        feature: 'WRITING',
        skill: 'WRITING',
        taskId: task.id,
        inputText: finalSubmission().submittedText,
      }),
      'feedback-writing-e2e',
      expect.any(String),
    ]);
    expect(JSON.stringify(response.body)).not.toMatch(
      /submittedText|provider|credential|rubric|official score/i,
    );
  });

  it('fails closed for active and cross-owner feedback requests', async () => {
    repository.findSession.mockResolvedValue(activeSession());
    await request(app.getHttpServer())
      .post(`/api/v1/toeic/writing/sessions/${activeSession().id}/feedback`)
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'feedback-writing-active')
      .expect(422);
    expect(feedbackGateway.request).not.toHaveBeenCalled();
    repository.findSession.mockResolvedValue({
      ...finalizedSession(),
      status: 'CANCELLED',
      finalizedAt: null,
      submission: null,
    });
    await request(app.getHttpServer())
      .post(`/api/v1/toeic/writing/sessions/${activeSession().id}/feedback`)
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'feedback-writing-cancelled')
      .expect(422);
    repository.findSession.mockResolvedValue({
      ...finalizedSession(),
      submission: null,
    });
    await request(app.getHttpServer())
      .post(`/api/v1/toeic/writing/sessions/${activeSession().id}/feedback`)
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'feedback-writing-incomplete')
      .expect(422);
    repository.findSession.mockResolvedValue(null);
    await request(app.getHttpServer())
      .post('/api/v1/toeic/writing/sessions/other-owner-session/feedback')
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'feedback-writing-other-owner')
      .expect(404);
    expect(repository.findSession.mock.calls).toContainEqual([
      principal.applicationUserId,
      'other-owner-session',
    ]);
    await request(app.getHttpServer())
      .post(`/api/v1/toeic/writing/sessions/${activeSession().id}/feedback`)
      .expect(401);
  });

  it('passes exact gateway replay state through the endpoint', async () => {
    repository.findSession.mockResolvedValue(finalizedSession());
    feedbackGateway.request.mockResolvedValueOnce({
      feedback: {
        outcome: 'PROVIDER_UNAVAILABLE',
        policyVersion: 'feedback-gateway-v1',
        promptVersion: 'local-fixture-v1',
        feature: 'WRITING',
        skill: 'WRITING',
        quotaRemaining: 8,
        feedback: null,
      },
      replayed: true,
    });
    const response = await request(app.getHttpServer())
      .post(`/api/v1/toeic/writing/sessions/${finalizedSession().id}/feedback`)
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'feedback-writing-replay')
      .expect(200);
    const body = response.body as { meta: { idempotencyStatus: string } };
    expect(body.meta.idempotencyStatus).toBe('replayed');
  });

  it('maps feedback gateway retry and validation failures to safe HTTP errors', async () => {
    repository.findSession.mockResolvedValue(finalizedSession());
    feedbackGateway.request.mockRejectedValueOnce(
      new ConflictException('changed payload'),
    );
    const conflict = await request(app.getHttpServer())
      .post(`/api/v1/toeic/writing/sessions/${finalizedSession().id}/feedback`)
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'feedback-writing-conflict')
      .expect(409);
    const conflictBody = conflict.body as { error: { code: string } };
    expect(conflictBody.error).toEqual(
      expect.objectContaining({ code: 'IDEMPOTENCY_CONFLICT' }),
    );

    feedbackGateway.request.mockRejectedValueOnce(
      new UnprocessableEntityException('missing key'),
    );
    const invalid = await request(app.getHttpServer())
      .post(`/api/v1/toeic/writing/sessions/${finalizedSession().id}/feedback`)
      .set('Authorization', 'Bearer local.token.value')
      .expect(422);
    const invalidBody = invalid.body as { error: { code: string } };
    expect(invalidBody.error).toEqual(
      expect.objectContaining({ code: 'VALIDATION_FAILED' }),
    );
  });
});
