import { createApplicationPrincipal, createExternalIdentity } from '../access';
import {
  type SpeakingSessionRecord,
  type ToeicSpeakingSubmissionRepository,
} from './toeic-speaking-submission.models';
import { TOEIC_ERROR_CODES } from './toeic-question.error';
import { ToeicSpeakingFeedbackService } from './toeic-speaking-feedback.service';
import type { ToeicRecordingService } from './toeic-recording.service';
import type { AiFeedbackGatewayService } from '../ai-gateway/ai-feedback.service';

const principal = createApplicationPrincipal({
  applicationUserId: 'speaking-feedback-owner',
  externalIdentity: createExternalIdentity({
    provider: 'SUPABASE',
    subject: 'speaking-feedback-subject',
    issuer: 'issuer',
    audience: 'authenticated',
  }),
  roles: ['FREE_USER'],
  ownerships: [],
  entitlements: [],
});

const finalizedSession: SpeakingSessionRecord = {
  id: 'speaking-feedback-session',
  userId: principal.applicationUserId,
  taskId: 'ep-speaking-read-aloud-001',
  taskVersion: 'v1',
  status: 'FINALIZED',
  startedAt: new Date('2026-08-10T00:00:00.000Z'),
  finalizedAt: new Date('2026-08-10T00:01:00.000Z'),
  submission: {
    id: 'speaking-feedback-submission',
    sessionId: 'speaking-feedback-session',
    userId: principal.applicationUserId,
    idempotencyKey: 'submit-speaking-feedback',
    responseMode: 'RECORDED_AUDIO',
    contentType: 'audio/webm',
    durationSeconds: 20,
    sizeBytes: 2048,
    submissionReference: 'opaque-submission-reference',
    submittedAt: new Date('2026-08-10T00:01:00.000Z'),
  },
};

describe('ToeicSpeakingFeedbackService', () => {
  let repository: jest.Mocked<ToeicSpeakingSubmissionRepository>;
  let recordings: jest.Mocked<Pick<ToeicRecordingService, 'getForSubmission'>>;
  let gateway: jest.Mocked<
    Pick<AiFeedbackGatewayService, 'requestUnavailable'>
  >;
  let service: ToeicSpeakingFeedbackService;

  beforeEach(() => {
    repository = {
      findSession: jest.fn().mockResolvedValue(finalizedSession),
      findByStartIdempotency: jest.fn(),
      findSubmissionByIdempotency: jest.fn(),
      createSession: jest.fn(),
      finalizeWithSubmission: jest.fn(),
    };
    recordings = {
      getForSubmission: jest.fn().mockResolvedValue({
        recording: {
          recordingId: 'speaking-recording-feedback',
          state: 'AVAILABLE',
          contentType: 'audio/webm',
          durationSeconds: 20,
          sizeBytes: 2048,
          expiresAt: new Date('2026-09-09T00:01:00.000Z'),
        },
      }),
    };
    gateway = {
      requestUnavailable: jest.fn().mockResolvedValue({
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
      }),
    };
    service = new ToeicSpeakingFeedbackService(
      repository,
      recordings as unknown as ToeicRecordingService,
      gateway as unknown as AiFeedbackGatewayService,
    );
  });

  it('owner-scopes finalized recording feedback and fails closed as unavailable', async () => {
    const result = await service.request(
      principal,
      finalizedSession.id,
      'feedback-speaking-001',
      'corr-speaking-001',
    );
    expect(result.feedback.outcome).toBe('PROVIDER_UNAVAILABLE');
    expect(result.feedback.feedback).toBeNull();
    expect(repository.findSession.mock.calls).toContainEqual([
      principal.applicationUserId,
      finalizedSession.id,
    ]);
    expect(recordings.getForSubmission.mock.calls).toContainEqual([
      principal,
      finalizedSession.submission?.id,
    ]);
    expect(gateway.requestUnavailable).toHaveBeenCalledWith(
      principal,
      expect.objectContaining({
        feature: 'SPEAKING',
        skill: 'SPEAKING',
        taskId: finalizedSession.taskId,
        inputReference: 'speaking-recording-feedback',
      }),
      'feedback-speaking-001',
      'corr-speaking-001',
    );
  });

  it('does not call the gateway for incomplete or unavailable recordings', async () => {
    repository.findSession.mockResolvedValue(null);
    await expect(
      service.request(
        principal,
        'missing-session',
        'feedback-speaking-002',
        'corr',
      ),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.NOT_FOUND });
    expect(gateway.requestUnavailable).not.toHaveBeenCalled();

    repository.findSession.mockResolvedValue({
      ...finalizedSession,
      status: 'ACTIVE',
      submission: null,
    });
    await expect(
      service.request(
        principal,
        finalizedSession.id,
        'feedback-speaking-003',
        'corr',
      ),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.INCOMPLETE });

    repository.findSession.mockResolvedValue(finalizedSession);
    recordings.getForSubmission.mockResolvedValue({
      recording: {
        recordingId: 'speaking-recording-feedback',
        state: 'EXPIRED',
        contentType: 'audio/webm',
        durationSeconds: 20,
        sizeBytes: 2048,
        expiresAt: new Date('2026-08-10T00:01:00.000Z'),
      },
    });
    await expect(
      service.request(
        principal,
        finalizedSession.id,
        'feedback-speaking-004',
        'corr',
      ),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.RECORDING_UNAVAILABLE });
    expect(gateway.requestUnavailable).not.toHaveBeenCalled();
  });
});
