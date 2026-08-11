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
import { TOEIC_SPEAKING_RECORDING_REPOSITORY } from '../src/modules/toeic/toeic-recording.models';
import type {
  PlaybackCapabilityRecord,
  SpeakingRecordingRecord,
  ToeicSpeakingRecordingRepository,
} from '../src/modules/toeic/toeic-recording.models';
import { createTaskVersion } from '../src/modules/toeic/toeic-speaking-writing.models';
import { PrismaService } from '../src/prisma/prisma.service';
import { AiFeedbackGatewayService } from '../src/modules/ai-gateway/ai-feedback.service';

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
  const recordingRepository: jest.Mocked<ToeicSpeakingRecordingRepository> = {
    findBySubmission: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    markExpired: jest.fn(),
    revoke: jest.fn(),
    createCapability: jest.fn(),
    findCapability: jest.fn(),
  };
  let latestCapabilityHash = '';
  const speakingFeedbackGateway = {
    requestUnavailable: jest.fn(),
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
    contentType: 'audio/webm',
    durationSeconds: 20,
    sizeBytes: 2048,
    submissionReference: 'recording-ref-e2e',
    submittedAt: new Date('2026-08-10T00:01:00.000Z'),
  });
  const recording = (): SpeakingRecordingRecord => ({
    id: 'speaking-recording-e2e',
    submissionId: finalSubmission().id,
    sessionId: activeSession().id,
    userId: principal.applicationUserId,
    provider: 'local-controlled-recording',
    objectKey: 'internal/recording-e2e',
    state: 'AVAILABLE',
    contentType: 'audio/webm',
    durationSeconds: 20,
    sizeBytes: 2048,
    expiresAt: new Date('2026-09-09T00:01:00.000Z'),
    revokedAt: null,
    deletedAt: null,
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
    recordingRepository.findBySubmission.mockResolvedValue(null);
    recordingRepository.findById.mockResolvedValue(recording());
    recordingRepository.create.mockResolvedValue(recording());
    recordingRepository.markExpired.mockResolvedValue(undefined);
    recordingRepository.revoke.mockResolvedValue(undefined);
    recordingRepository.createCapability.mockImplementation(
      (input): Promise<PlaybackCapabilityRecord> => {
        latestCapabilityHash = input.tokenHash;
        return Promise.resolve({
          id: 'capability-e2e',
          recordingId: input.recordingId,
          userId: input.userId,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
          revokedAt: null,
        });
      },
    );
    recordingRepository.findCapability.mockImplementation(
      (_userId, _recordingId, tokenHash) =>
        Promise.resolve(
          tokenHash === latestCapabilityHash
            ? {
                id: 'capability-e2e',
                recordingId: recording().id,
                userId: principal.applicationUserId,
                tokenHash,
                expiresAt: new Date(Date.now() + 60_000),
                revokedAt: null,
              }
            : null,
        ),
    );
    speakingFeedbackGateway.requestUnavailable.mockResolvedValue({
      feedback: {
        outcome: 'PROVIDER_UNAVAILABLE',
        policyVersion: 'feedback-gateway-v1',
        promptVersion: 'local-fixture-v1',
        feature: 'SPEAKING',
        skill: 'SPEAKING',
        quotaRemaining: 9,
        feedback: null,
      },
      replayed: false,
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
      .overrideProvider(TOEIC_SPEAKING_RECORDING_REPOSITORY)
      .useValue(recordingRepository)
      .overrideProvider(AiFeedbackGatewayService)
      .useValue(speakingFeedbackGateway)
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
        recordingId: 'speaking-recording-e2e',
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

  it('fails closed for Speaking feedback while preserving gateway ownership and idempotency', async () => {
    repository.findSession.mockResolvedValue({
      ...activeSession(),
      status: 'FINALIZED',
      finalizedAt: new Date('2026-08-10T00:01:00.000Z'),
      submission: finalSubmission(),
    });
    recordingRepository.findBySubmission.mockResolvedValue(recording());

    const response = await request(app.getHttpServer())
      .post(`/api/v1/toeic/speaking/sessions/${activeSession().id}/feedback`)
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'feedback-speaking-e2e')
      .set('X-Correlation-Id', 'corr-speaking-e2e')
      .expect(200);
    const responseBody = response.body as {
      data: {
        feedback: { outcome: string; feedback: unknown };
      };
    };
    expect(responseBody.data.feedback.outcome).toBe('PROVIDER_UNAVAILABLE');
    expect(responseBody.data.feedback.feedback).toBeNull();
    expect(JSON.stringify(response.body)).not.toMatch(
      /audioBytes|objectKey|credential|rubric|score|submissionReference/i,
    );
    expect(speakingFeedbackGateway.requestUnavailable).toHaveBeenCalledWith(
      principal,
      expect.objectContaining({
        feature: 'SPEAKING',
        skill: 'SPEAKING',
        taskId: task.id,
        inputReference: recording().id,
      }),
      'feedback-speaking-e2e',
      'corr-speaking-e2e',
    );

    repository.findSession.mockResolvedValue(activeSession());
    await request(app.getHttpServer())
      .post(`/api/v1/toeic/speaking/sessions/${activeSession().id}/feedback`)
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'feedback-speaking-active')
      .expect(422);

    repository.findSession.mockResolvedValue({
      ...activeSession(),
      status: 'FINALIZED',
      finalizedAt: new Date('2026-08-10T00:01:00.000Z'),
      submission: finalSubmission(),
    });
    recordingRepository.findBySubmission.mockResolvedValue(null);
    await request(app.getHttpServer())
      .post(`/api/v1/toeic/speaking/sessions/${activeSession().id}/feedback`)
      .set('Authorization', 'Bearer local.token.value')
      .set('Idempotency-Key', 'feedback-speaking-missing-recording')
      .expect(404);
    expect(speakingFeedbackGateway.requestUnavailable).toHaveBeenCalledTimes(1);
  });

  it('issues owner-scoped playback capability and fails closed after revocation', async () => {
    const recordingResponse = await request(app.getHttpServer())
      .get('/api/v1/toeic/speaking/recordings/speaking-recording-e2e')
      .set('Authorization', 'Bearer local.token.value')
      .expect(200);
    expect(JSON.stringify(recordingResponse.body)).not.toMatch(
      /objectKey|provider|credential|tokenHash/i,
    );

    const capabilityResponse = await request(app.getHttpServer())
      .post(
        '/api/v1/toeic/speaking/recordings/speaking-recording-e2e/playback-capability',
      )
      .set('Authorization', 'Bearer local.token.value')
      .expect(200);
    const capabilityBody = capabilityResponse.body as {
      data: { playback: { capability: string } };
    };
    const capability = capabilityBody.data.playback.capability;
    expect(capability).toMatch(/^[A-Za-z0-9_-]{43}$/);

    await request(app.getHttpServer())
      .get('/api/v1/toeic/speaking/recordings/speaking-recording-e2e/playback')
      .set('Authorization', 'Bearer local.token.value')
      .set('X-Playback-Capability', 'invalid-playback-capability-123456789')
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/v1/toeic/speaking/recordings/speaking-recording-e2e/playback')
      .set('Authorization', 'Bearer local.token.value')
      .set('X-Playback-Capability', capability)
      .expect(200);

    const upload = await request(app.getHttpServer())
      .post('/api/v1/toeic/speaking/recordings/speaking-recording-e2e/content')
      .set('Authorization', 'Bearer local.token.value')
      .attach('file', Buffer.alloc(2048, 1), {
        filename: 'speaking.webm',
        contentType: 'audio/webm',
      })
      .expect(200);
    expect((upload.body as { data: { uploaded: boolean } }).data.uploaded).toBe(
      true,
    );

    const content = await request(app.getHttpServer())
      .get(
        '/api/v1/toeic/speaking/recordings/speaking-recording-e2e/playback/content',
      )
      .set('Authorization', 'Bearer local.token.value')
      .set('X-Playback-Capability', capability)
      .expect(200);
    expect(content.headers['content-type']).toContain('audio/webm');
    expect(content.body).toEqual(Buffer.alloc(2048, 1));

    await request(app.getHttpServer())
      .post('/api/v1/toeic/speaking/recordings/speaking-recording-e2e/revoke')
      .set('Authorization', 'Bearer local.token.value')
      .expect(200);
    recordingRepository.findById.mockResolvedValueOnce({
      ...recording(),
      state: 'REVOKED',
      revokedAt: new Date(),
    });
    await request(app.getHttpServer())
      .post(
        '/api/v1/toeic/speaking/recordings/speaking-recording-e2e/playback-capability',
      )
      .set('Authorization', 'Bearer local.token.value')
      .expect(422);

    recordingRepository.findById.mockResolvedValueOnce(null);
    await request(app.getHttpServer())
      .get('/api/v1/toeic/speaking/recordings/foreign-recording')
      .set('Authorization', 'Bearer local.token.value')
      .expect(404);
    await request(app.getHttpServer())
      .get('/api/v1/toeic/speaking/recordings/speaking-recording-e2e')
      .expect(401);
  });
});
