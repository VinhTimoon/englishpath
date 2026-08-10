import { INestApplication } from '@nestjs/common';
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
import { TOEIC_SPEAKING_SUBMISSION_REPOSITORY } from '../src/modules/toeic/toeic-speaking-submission.models';
import type {
  SpeakingSessionRecord,
  SpeakingSubmissionRecord,
  ToeicSpeakingSubmissionRepository,
} from '../src/modules/toeic/toeic-speaking-submission.models';
import { TOEIC_SPEAKING_TASK_CATALOGUE } from '../src/modules/toeic/toeic-speaking-submission.models';
import type { ToeicSpeakingTaskCatalogue } from '../src/modules/toeic/toeic-speaking-submission.models';
import { createTaskVersion } from '../src/modules/toeic/toeic-speaking-writing.models';
import { PrismaService } from '../src/prisma/prisma.service';

describe('TOEIC Speaking submission vertical slice (e2e)', () => {
  let app: INestApplication<App>;
  const external = createExternalIdentity({
    provider: 'SUPABASE',
    subject: 'speaking-e2e-user',
    issuer: 'issuer',
    audience: 'authenticated',
  });
  const principal = createApplicationPrincipal({
    applicationUserId: 'speaking-e2e-owner',
    externalIdentity: external,
    roles: ['FREE_USER'],
    ownerships: [],
    entitlements: [],
  });
  const task = createTaskVersion({
    id: 'speaking-e2e-task',
    skill: 'SPEAKING',
    taskType: 'READ_ALOUD',
    version: 'v1',
    promptKind: 'TEXT',
    responseMode: 'RECORDED_AUDIO',
    instruction: 'Read clearly.',
    prompt: 'A safe learner task.',
    durationSeconds: 45,
    publicationState: 'PUBLISHED',
  });
  const repository: jest.Mocked<ToeicSpeakingSubmissionRepository> = {
    findSession: jest.fn(),
    findByStartIdempotency: jest.fn(),
    findSubmissionByIdempotency: jest.fn(),
    createSession: jest.fn(),
    finalizeWithSubmission: jest.fn(),
  };
  const catalogue: jest.Mocked<ToeicSpeakingTaskCatalogue> = {
    findPublished: jest.fn().mockResolvedValue(task),
  };

  const activeSession = (): SpeakingSessionRecord => ({
    id: 'speaking-session-e2e',
    userId: principal.applicationUserId,
    taskId: task.id,
    taskVersion: task.version,
    status: 'ACTIVE',
    startedAt: new Date('2026-08-10T00:00:00.000Z'),
    finalizedAt: null,
    submission: null,
  });
  const finalSubmission = (): SpeakingSubmissionRecord => ({
    id: 'speaking-submission-e2e',
    sessionId: activeSession().id,
    userId: principal.applicationUserId,
    idempotencyKey: 'submit-e2e',
    responseMode: 'RECORDED_AUDIO',
    durationSeconds: 20,
    sizeBytes: 2048,
    submissionReference: 'recording-ref-e2e',
    submittedAt: new Date('2026-08-10T00:01:00.000Z'),
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
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({ $queryRaw: jest.fn().mockResolvedValue([{ result: 1 }]) })
      .overrideProvider(EXTERNAL_IDENTITY_VERIFIER)
      .useValue({ verify: jest.fn().mockResolvedValue(external) })
      .overrideProvider(APPLICATION_PRINCIPAL_RESOLVER)
      .useValue({ resolve: jest.fn().mockResolvedValue(principal) })
      .overrideProvider(TOEIC_SPEAKING_SUBMISSION_REPOSITORY)
      .useValue(repository)
      .overrideProvider(TOEIC_SPEAKING_TASK_CATALOGUE)
      .useValue(catalogue)
      .compile();
    app = module.createNestApplication();
    await app.init();
  });

  it('starts and finalizes an owner-scoped safe submission with exact replay', async () => {
    const start = await request(app.getHttpServer())
      .post(`/api/v1/toeic/speaking/tasks/${task.id}/sessions`)
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'start-e2e')
      .expect(200);
    const startBody = start.body as {
      data: { session: { task: { id: string; skill: string } } };
    };
    expect(startBody.data.session.task).toEqual(
      expect.objectContaining({ id: task.id, skill: 'SPEAKING' }),
    );
    expect(JSON.stringify(start.body)).not.toMatch(
      /provider|credential|rubric|weight|official|score/i,
    );
    expect(repository.createSession.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ userId: principal.applicationUserId }),
    );

    const submit = await request(app.getHttpServer())
      .post(`/api/v1/toeic/speaking/sessions/${activeSession().id}/submissions`)
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'submit-e2e')
      .send({
        responseMode: 'RECORDED_AUDIO',
        durationSeconds: 20,
        sizeBytes: 2048,
        submissionReference: 'recording-ref-e2e',
      })
      .expect(200);
    const submitBody = submit.body as {
      data: {
        session: {
          status: string;
          submission: Record<string, unknown>;
        };
      };
    };
    expect(submitBody.data.session.status).toBe('FINALIZED');
    expect(submitBody.data.session.submission).toEqual(
      expect.objectContaining({
        submissionId: 'speaking-submission-e2e',
        durationSeconds: 20,
      }),
    );
    expect(JSON.stringify(submit.body)).not.toMatch(
      /audioBytes|objectKey|provider|token|rubric|score/i,
    );
  });

  it('rejects missing idempotency and over-duration submissions', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/toeic/speaking/tasks/${task.id}/sessions`)
      .set('Authorization', 'Bearer local.token.value')
      .expect(400);
    await request(app.getHttpServer())
      .post(`/api/v1/toeic/speaking/sessions/${activeSession().id}/submissions`)
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'submit-too-long')
      .send({
        responseMode: 'RECORDED_AUDIO',
        durationSeconds: 46,
        sizeBytes: 2048,
        submissionReference: 'recording-ref-e2e',
      })
      .expect(422);
  });
});
