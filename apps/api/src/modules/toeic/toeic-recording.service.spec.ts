import { createApplicationPrincipal, createExternalIdentity } from '../access';
import type {
  SpeakingSessionRecord,
  SpeakingSubmissionRecord,
} from './toeic-speaking-submission.models';
import { ToeicQuestionError } from './toeic-question.error';
import type {
  PlaybackCapabilityCreate,
  SpeakingRecordingRecord,
  ToeicSpeakingRecordingRepository,
  ToeicSpeakingRecordingStorage,
} from './toeic-recording.models';
import { ToeicRecordingService } from './toeic-recording.service';

const principal = createApplicationPrincipal({
  applicationUserId: 'recording-owner',
  externalIdentity: createExternalIdentity({
    provider: 'SUPABASE',
    subject: 'recording-subject',
    issuer: 'issuer',
    audience: 'authenticated',
  }),
  roles: ['FREE_USER'],
  ownerships: [],
  entitlements: [],
});
const submission: SpeakingSubmissionRecord = {
  id: 'recording-submission',
  sessionId: 'recording-session',
  userId: principal.applicationUserId,
  idempotencyKey: 'submission-key',
  responseMode: 'RECORDED_AUDIO',
  contentType: 'audio/webm',
  durationSeconds: 20,
  sizeBytes: 2048,
  submissionReference: 'recording-ref',
  submittedAt: new Date('2026-08-10T00:00:00.000Z'),
};
const session: SpeakingSessionRecord = {
  id: submission.sessionId,
  userId: principal.applicationUserId,
  taskId: 'task',
  taskVersion: 'v1',
  status: 'FINALIZED',
  startedAt: new Date('2026-08-10T00:00:00.000Z'),
  finalizedAt: new Date('2026-08-10T00:00:00.000Z'),
  submission,
};
const recording = (): SpeakingRecordingRecord => ({
  id: 'recording-001',
  submissionId: submission.id,
  sessionId: session.id,
  userId: principal.applicationUserId,
  provider: 'local-controlled-recording',
  objectKey: 'internal/object-key',
  state: 'AVAILABLE',
  contentType: 'audio/webm',
  durationSeconds: 20,
  sizeBytes: 2048,
  expiresAt: new Date('2026-09-09T00:00:00.000Z'),
  revokedAt: null,
  deletedAt: null,
});

describe('ToeicRecordingService', () => {
  let repository: jest.Mocked<ToeicSpeakingRecordingRepository>;
  let storage: jest.Mocked<ToeicSpeakingRecordingStorage>;
  let service: ToeicRecordingService;

  beforeEach(() => {
    repository = {
      findBySubmission: jest.fn().mockResolvedValue(null),
      findById: jest.fn().mockResolvedValue(recording()),
      create: jest.fn().mockResolvedValue(recording()),
      markExpired: jest.fn().mockResolvedValue(undefined),
      revoke: jest.fn().mockResolvedValue(undefined),
      createCapability: jest
        .fn()
        .mockImplementation((input: PlaybackCapabilityCreate) =>
          Promise.resolve({
            id: 'capability-001',
            recordingId: input.recordingId,
            userId: input.userId,
            tokenHash: input.tokenHash,
            expiresAt: input.expiresAt,
            revokedAt: null,
          }),
        ),
      findCapability: jest.fn().mockResolvedValue({
        id: 'capability-001',
        recordingId: recording().id,
        userId: principal.applicationUserId,
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
      }),
    };
    storage = {
      register: jest.fn().mockResolvedValue({ state: 'AVAILABLE' }),
      write: jest.fn().mockResolvedValue(undefined),
      read: jest.fn().mockResolvedValue(Buffer.alloc(2_048, 1)),
    };
    service = new ToeicRecordingService(repository, storage);
  });

  it('registers a finalized owner submission without exposing internal storage', async () => {
    const result = await service.ensureForSubmission(
      principal,
      session,
      'audio/webm',
    );
    expect(result).toEqual(
      expect.objectContaining({
        recordingId: recording().id,
        state: 'AVAILABLE',
        contentType: 'audio/webm',
      }),
    );
    expect(JSON.stringify(result)).not.toMatch(/provider|objectKey|token/i);
    expect(storage.register.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ provider: 'local-controlled-recording' }),
    );
    expect(repository.create.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        userId: principal.applicationUserId,
        durationSeconds: 20,
        sizeBytes: 2048,
      }),
    );
  });

  it('accepts exact policy limits and rejects values above them', async () => {
    repository.create.mockResolvedValue({
      ...recording(),
      contentType: 'audio/mp4',
      durationSeconds: 3_600,
      sizeBytes: 10_000_000,
    });
    await expect(
      service.ensureForSubmission(
        principal,
        {
          ...session,
          submission: {
            ...submission,
            durationSeconds: 3_600,
            sizeBytes: 10_000_000,
          },
        },
        'audio/mp4',
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        contentType: 'audio/mp4',
        durationSeconds: 3_600,
        sizeBytes: 10_000_000,
      }),
    );

    await expect(
      service.ensureForSubmission(
        principal,
        {
          ...session,
          submission: {
            ...submission,
            durationSeconds: 3_601,
          },
        },
        'audio/webm',
      ),
    ).rejects.toMatchObject({ code: 'INVALID_CONTENT' });
    await expect(
      service.ensureForSubmission(
        principal,
        {
          ...session,
          submission: {
            ...submission,
            sizeBytes: 10_000_001,
          },
        },
        'audio/webm',
      ),
    ).rejects.toMatchObject({ code: 'INVALID_CONTENT' });
  });

  it('replays an existing owner recording without registering or creating again', async () => {
    repository.findBySubmission.mockResolvedValue(recording());
    const result = await service.ensureForSubmission(
      principal,
      session,
      'audio/webm',
    );
    expect(result.recordingId).toBe(recording().id);
    expect(storage.register.mock.calls).toHaveLength(0);
    expect(repository.create.mock.calls).toHaveLength(0);
  });

  it('fails closed when a finalized submission has no recording asset', async () => {
    repository.findBySubmission.mockResolvedValue(null);
    await expect(
      service.getForSubmission(principal, submission.id),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('fails closed for invalid metadata and incomplete sessions', async () => {
    await expect(
      service.ensureForSubmission(principal, session, 'video/mp4'),
    ).rejects.toBeInstanceOf(ToeicQuestionError);
    await expect(
      service.ensureForSubmission(
        principal,
        { ...session, status: 'ACTIVE', submission: null },
        'audio/webm',
      ),
    ).rejects.toMatchObject({ code: 'INCOMPLETE' });
  });

  it('issues and authorizes short-lived owner playback capabilities', async () => {
    const issued = await service.issuePlayback(principal, recording().id);
    expect(issued.playback.capability).toHaveLength(43);
    expect(issued.playback.expiresAt.getTime()).toBeLessThanOrEqual(
      recording().expiresAt.getTime(),
    );
    expect(issued.playback.expiresAt.getTime()).toBeLessThanOrEqual(
      Date.now() + 300_000,
    );
    const authorized = await service.authorizePlayback(
      principal,
      recording().id,
      issued.playback.capability,
    );
    expect(authorized.playback.authorized).toBe(true);
    expect(JSON.stringify(authorized)).not.toMatch(
      /objectKey|provider|credential/i,
    );
    expect(repository.findCapability.mock.calls[0]?.[2]).toMatch(
      /^[a-f0-9]{64}$/,
    );
  });

  it('stores bounded owner content and reads it only with a valid capability', async () => {
    const content = Buffer.alloc(2_048, 1);
    await expect(
      service.uploadContent(principal, recording().id, content, 'audio/webm'),
    ).resolves.toEqual(expect.objectContaining({ uploaded: true }));
    expect(storage.write.mock.calls[0]).toEqual([
      expect.objectContaining({ objectKey: recording().objectKey }),
      content,
      'audio/webm',
    ]);

    const issued = await service.issuePlayback(principal, recording().id);
    await expect(
      service.readPlayback(
        principal,
        recording().id,
        issued.playback.capability,
      ),
    ).resolves.toEqual({ content, contentType: 'audio/webm' });
  });

  it('rejects a wrong-length-valid capability instead of trusting its shape', async () => {
    repository.findCapability.mockResolvedValueOnce(null);
    await expect(
      service.authorizePlayback(principal, recording().id, 'a'.repeat(43)),
    ).rejects.toMatchObject({ code: 'CAPABILITY_INVALID' });
    expect(repository.findCapability.mock.calls[0]?.[2]).toMatch(
      /^[a-f0-9]{64}$/,
    );
  });

  it('rejects an expired playback capability even for the recording owner', async () => {
    repository.findCapability.mockResolvedValue({
      id: 'capability-expired',
      recordingId: recording().id,
      userId: principal.applicationUserId,
      tokenHash: 'hash',
      expiresAt: new Date(Date.now() - 1_000),
      revokedAt: null,
    });
    await expect(
      service.authorizePlayback(principal, recording().id, 'a'.repeat(43)),
    ).rejects.toMatchObject({ code: 'CAPABILITY_INVALID' });
  });

  it('rejects content mutation after revocation and rejects size drift', async () => {
    await expect(
      service.uploadContent(
        principal,
        recording().id,
        Buffer.alloc(2_047),
        'audio/webm',
      ),
    ).rejects.toMatchObject({ code: 'INVALID_CONTENT' });

    repository.findById.mockResolvedValueOnce({
      ...recording(),
      state: 'REVOKED',
      revokedAt: new Date(),
    });
    await expect(
      service.uploadContent(
        principal,
        recording().id,
        Buffer.alloc(2_048),
        'audio/webm',
      ),
    ).rejects.toMatchObject({ code: 'RECORDING_UNAVAILABLE' });
  });

  it('revokes playback through the owner-scoped repository', async () => {
    await service.revoke(principal, recording().id);
    expect(repository.revoke.mock.calls[0]).toEqual([
      principal.applicationUserId,
      recording().id,
      expect.any(Date),
    ]);
  });

  it('expires recordings and rejects playback after the retention boundary', async () => {
    repository.findById.mockResolvedValueOnce({
      ...recording(),
      expiresAt: new Date(Date.now() - 1_000),
    });
    await expect(
      service.issuePlayback(principal, recording().id),
    ).rejects.toMatchObject({ code: 'RECORDING_UNAVAILABLE' });
    expect(repository.markExpired.mock.calls[0]).toEqual([
      principal.applicationUserId,
      recording().id,
    ]);
  });
});
