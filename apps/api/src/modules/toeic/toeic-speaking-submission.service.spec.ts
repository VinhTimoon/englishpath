import { createApplicationPrincipal, createExternalIdentity } from '../access';
import type {
  SpeakingSessionRecord,
  SpeakingSubmissionRecord,
  ToeicSpeakingSubmissionRepository,
  ToeicSpeakingTaskCatalogue,
} from './toeic-speaking-submission.models';
import { ToeicSpeakingSubmissionService } from './toeic-speaking-submission.service';
import { createTaskVersion } from './toeic-speaking-writing.models';
import type { SubmitToeicSpeakingDto } from './dto/toeic-speaking-submission.dto';

const task = createTaskVersion({
  id: 'ep-speaking-read-aloud-001',
  skill: 'SPEAKING',
  taskType: 'READ_ALOUD',
  version: 'v1',
  promptKind: 'TEXT',
  responseMode: 'RECORDED_AUDIO',
  instruction: 'Read clearly.',
  prompt: 'The morning lesson starts at nine.',
  durationSeconds: 45,
  publicationState: 'PUBLISHED',
});
const principal = createApplicationPrincipal({
  applicationUserId: 'speaking-owner',
  externalIdentity: createExternalIdentity({
    provider: 'SUPABASE',
    subject: 'speaking-subject',
    issuer: 'issuer',
    audience: 'authenticated',
  }),
  roles: ['FREE_USER'],
  ownerships: [],
  entitlements: [],
});

function session(
  overrides: Partial<SpeakingSessionRecord> = {},
): SpeakingSessionRecord {
  return {
    id: 'session-001',
    userId: principal.applicationUserId,
    taskId: task.id,
    taskVersion: task.version,
    status: 'ACTIVE',
    startedAt: new Date('2026-08-10T00:00:00.000Z'),
    finalizedAt: null,
    submission: null,
    ...overrides,
  };
}

function submission(
  overrides: Partial<SpeakingSubmissionRecord> = {},
): SpeakingSubmissionRecord {
  return {
    id: 'submission-001',
    sessionId: 'session-001',
    userId: principal.applicationUserId,
    idempotencyKey: 'submit-001',
    responseMode: 'RECORDED_AUDIO',
    durationSeconds: 20,
    sizeBytes: 1024,
    submissionReference: 'recording-ref-001',
    submittedAt: new Date('2026-08-10T00:01:00.000Z'),
    ...overrides,
  };
}

function dto(
  overrides: Partial<SubmitToeicSpeakingDto> = {},
): SubmitToeicSpeakingDto {
  return {
    responseMode: 'RECORDED_AUDIO',
    durationSeconds: 20,
    sizeBytes: 1024,
    submissionReference: 'recording-ref-001',
    ...overrides,
  };
}

describe('ToeicSpeakingSubmissionService', () => {
  let repository: jest.Mocked<ToeicSpeakingSubmissionRepository>;
  let catalogue: jest.Mocked<ToeicSpeakingTaskCatalogue>;
  let service: ToeicSpeakingSubmissionService;

  beforeEach(() => {
    repository = {
      findSession: jest.fn(),
      findByStartIdempotency: jest.fn(),
      findSubmissionByIdempotency: jest.fn(),
      createSession: jest.fn(),
      finalizeWithSubmission: jest.fn(),
    };
    catalogue = { findPublished: jest.fn().mockResolvedValue(task) };
    service = new ToeicSpeakingSubmissionService(repository, catalogue);
  });

  it('starts a published task and replays the same start key', async () => {
    repository.findByStartIdempotency
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(session());
    repository.createSession.mockResolvedValue(session());

    const first = await service.start(principal, task.id, 'start-001');
    const replay = await service.start(principal, task.id, 'start-001');

    expect(first.replayed).toBe(false);
    expect(replay.replayed).toBe(true);
    expect(first.session.task.prompt).toBe(task.prompt);
    expect(repository.findByStartIdempotency.mock.calls[0]).toEqual([
      principal.applicationUserId,
      'start-001',
    ]);
  });

  it('rejects a changed task on a reused start key', async () => {
    repository.findByStartIdempotency.mockResolvedValue(session());
    catalogue.findPublished.mockResolvedValue({ ...task, id: 'other-task' });
    await expect(
      service.start(principal, 'other-task', 'start-001'),
    ).rejects.toMatchObject({
      code: 'CONFLICT',
    });
  });

  it('finalizes once and replays an exact submission without exposing raw data', async () => {
    const finalized = session({
      status: 'FINALIZED',
      finalizedAt: new Date('2026-08-10T00:01:00.000Z'),
      submission: submission(),
    });
    repository.findSession
      .mockResolvedValueOnce(session())
      .mockResolvedValueOnce(finalized);
    repository.finalizeWithSubmission.mockResolvedValue({
      session: finalized,
      created: true,
    });

    const first = await service.submit(
      principal,
      session().id,
      dto(),
      'submit-001',
    );
    repository.findSession.mockResolvedValue(finalized);
    repository.findSubmissionByIdempotency.mockResolvedValue(submission());
    const replay = await service.submit(
      principal,
      session().id,
      dto(),
      'submit-001',
    );

    expect(first.replayed).toBe(false);
    expect(replay.replayed).toBe(true);
    expect(first.session.submission).toEqual(
      expect.objectContaining({ submissionId: 'submission-001' }),
    );
    expect(JSON.stringify(first)).not.toMatch(/provider|credential|token|raw/i);
  });

  it('rejects an oversized or cross-owner submission', async () => {
    repository.findSession.mockResolvedValue(session());
    await expect(
      service.submit(
        principal,
        session().id,
        dto({ durationSeconds: 46 }),
        'submit-001',
      ),
    ).rejects.toMatchObject({ code: 'INVALID_CONTENT' });

    repository.findSession.mockResolvedValue(null);
    await expect(
      service.submit(principal, 'other-session', dto(), 'submit-002'),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
