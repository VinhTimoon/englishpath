import { createApplicationPrincipal, createExternalIdentity } from '../access';
import {
  AI_FEEDBACK_PROMPT_VERSION,
  type SafeFeedbackResponse,
} from '../ai-gateway/ai-feedback.models';
import { AiFeedbackGatewayService } from '../ai-gateway/ai-feedback.service';
import {
  type ToeicWritingSubmissionRepository,
  type WritingSessionRecord,
} from './toeic-writing-submission.models';
import { TOEIC_ERROR_CODES } from './toeic-question.error';
import { ToeicWritingFeedbackService } from './toeic-writing-feedback.service';

const principal = createApplicationPrincipal({
  applicationUserId: 'writing-feedback-owner',
  externalIdentity: createExternalIdentity({
    provider: 'SUPABASE',
    subject: 'writing-feedback-subject',
    issuer: 'issuer',
    audience: 'authenticated',
  }),
  roles: ['FREE_USER'],
  ownerships: [],
  entitlements: [],
});

const finalizedSession: WritingSessionRecord = {
  id: 'writing-feedback-session',
  userId: principal.applicationUserId,
  taskId: 'ep-writing-sentence-001',
  taskVersion: 'v1',
  status: 'FINALIZED',
  startedAt: new Date('2026-08-10T00:00:00.000Z'),
  finalizedAt: new Date('2026-08-10T00:01:00.000Z'),
  submission: {
    id: 'writing-feedback-submission',
    sessionId: 'writing-feedback-session',
    userId: principal.applicationUserId,
    idempotencyKey: 'submit-writing-feedback',
    responseMode: 'TEXT',
    wordCount: 8,
    characterCount: 48,
    submittedText: 'Daily practice helps me learn English every morning.',
    submittedAt: new Date('2026-08-10T00:01:00.000Z'),
  },
};

const feedback: SafeFeedbackResponse = {
  outcome: 'ALLOWED',
  policyVersion: 'feedback-gateway-v1',
  promptVersion: AI_FEEDBACK_PROMPT_VERSION,
  feature: 'WRITING',
  skill: 'WRITING',
  quotaRemaining: 9,
  feedback: {
    advisoryOnly: true,
    summary: 'A safe advisory summary.',
    strengths: ['The response is complete.'],
    nextSteps: ['Review word choice.'],
  },
};

describe('ToeicWritingFeedbackService', () => {
  let repository: jest.Mocked<ToeicWritingSubmissionRepository>;
  let gateway: jest.Mocked<Pick<AiFeedbackGatewayService, 'request'>>;
  let service: ToeicWritingFeedbackService;

  beforeEach(() => {
    repository = {
      findSession: jest.fn().mockResolvedValue(finalizedSession),
      findByStartIdempotency: jest.fn(),
      findSubmissionByIdempotency: jest.fn(),
      createSession: jest.fn(),
      finalizeWithSubmission: jest.fn(),
    };
    gateway = {
      request: jest.fn().mockResolvedValue({
        feedback,
        replayed: false,
      }),
    };
    service = new ToeicWritingFeedbackService(
      repository,
      gateway as unknown as AiFeedbackGatewayService,
    );
  });

  it('loads the owner submission and delegates only through the gateway', async () => {
    const result = await service.request(
      principal,
      finalizedSession.id,
      'feedback-writing-001',
      'corr-writing-001',
    );
    expect(result.feedback).toEqual(feedback);
    expect(gateway.request).toHaveBeenCalledWith(
      principal,
      expect.objectContaining({
        feature: 'WRITING',
        skill: 'WRITING',
        taskId: finalizedSession.taskId,
        inputText: finalizedSession.submission?.submittedText,
      }),
      'feedback-writing-001',
      'corr-writing-001',
    );
    expect(JSON.stringify(result)).not.toContain(
      finalizedSession.submission?.submittedText,
    );
  });

  it('fails closed for missing, active, and submission-less sessions', async () => {
    repository.findSession.mockResolvedValue(null);
    await expect(
      service.request(
        principal,
        'other-session',
        'feedback-writing-002',
        'corr',
      ),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.NOT_FOUND });

    repository.findSession.mockResolvedValue({
      ...finalizedSession,
      status: 'ACTIVE',
      submission: null,
    });
    await expect(
      service.request(
        principal,
        finalizedSession.id,
        'feedback-writing-003',
        'corr',
      ),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.INCOMPLETE });
    expect(gateway.request).not.toHaveBeenCalled();
  });

  it('preserves a provider-unavailable or replayed gateway result', async () => {
    gateway.request.mockResolvedValueOnce({
      feedback: {
        ...feedback,
        feedback: null,
        outcome: 'PROVIDER_UNAVAILABLE',
      },
      replayed: true,
    });
    const result = await service.request(
      principal,
      finalizedSession.id,
      'feedback-writing-004',
      'corr',
    );
    expect(result.replayed).toBe(true);
    expect(result.feedback.feedback).toBeNull();
    expect(result.feedback.outcome).toBe('PROVIDER_UNAVAILABLE');
  });
});
