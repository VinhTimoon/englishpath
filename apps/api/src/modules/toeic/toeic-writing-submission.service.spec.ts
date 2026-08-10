import { createApplicationPrincipal, createExternalIdentity } from '../access';
import type {
  ToeicWritingSubmissionRepository,
  ToeicWritingTaskCatalogue,
  WritingSessionRecord,
  WritingSubmissionRecord,
} from './toeic-writing-submission.models';
import {
  ToeicWritingSubmissionService,
  countWritingWords,
} from './toeic-writing-submission.service';
import { createTaskVersion } from './toeic-speaking-writing.models';
import type { SubmitToeicWritingDto } from './dto/toeic-writing-submission.dto';

const task = createTaskVersion({
  id: 'ep-writing-sentence-001',
  skill: 'WRITING',
  taskType: 'SENTENCE_BASED',
  version: 'v1',
  promptKind: 'TEXT',
  responseMode: 'TEXT',
  instruction: 'Write clearly.',
  prompt: 'Describe your study habit.',
  minWords: 5,
  maxWords: 20,
  publicationState: 'PUBLISHED',
});
const principal = createApplicationPrincipal({
  applicationUserId: 'writing-owner',
  externalIdentity: createExternalIdentity({
    provider: 'SUPABASE',
    subject: 'writing-subject',
    issuer: 'issuer',
    audience: 'authenticated',
  }),
  roles: ['FREE_USER'],
  ownerships: [],
  entitlements: [],
});
const text = 'Daily practice helps me improve my English skills.';

function session(
  overrides: Partial<WritingSessionRecord> = {},
): WritingSessionRecord {
  return {
    id: 'writing-session-001',
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
  overrides: Partial<WritingSubmissionRecord> = {},
): WritingSubmissionRecord {
  return {
    id: 'writing-submission-001',
    sessionId: 'writing-session-001',
    userId: principal.applicationUserId,
    idempotencyKey: 'submit-001',
    responseMode: 'TEXT',
    wordCount: countWritingWords(text),
    characterCount: Array.from(text).length,
    submittedText: text,
    submittedAt: new Date('2026-08-10T00:01:00.000Z'),
    ...overrides,
  };
}

function dto(
  overrides: Partial<SubmitToeicWritingDto> = {},
): SubmitToeicWritingDto {
  return { text, ...overrides };
}

describe('ToeicWritingSubmissionService', () => {
  let repository: jest.Mocked<ToeicWritingSubmissionRepository>;
  let catalogue: jest.Mocked<ToeicWritingTaskCatalogue>;
  let service: ToeicWritingSubmissionService;

  beforeEach(() => {
    repository = {
      findSession: jest.fn(),
      findByStartIdempotency: jest.fn(),
      findSubmissionByIdempotency: jest.fn(),
      createSession: jest.fn(),
      finalizeWithSubmission: jest.fn(),
    };
    catalogue = { findPublished: jest.fn().mockResolvedValue(task) };
    service = new ToeicWritingSubmissionService(repository, catalogue);
  });

  it('counts Unicode words deterministically and replays the same start key', async () => {
    expect(countWritingWords('Học tiếng Anh mỗi ngày.')).toBe(5);
    repository.findByStartIdempotency
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(session());
    repository.createSession.mockResolvedValue(session());
    expect(
      (await service.start(principal, task.id, 'start-001')).replayed,
    ).toBe(false);
    expect(
      (await service.start(principal, task.id, 'start-001')).replayed,
    ).toBe(true);
  });

  it('rejects below-bound text, cross-owner sessions, and finalization conflicts', async () => {
    repository.findSession.mockResolvedValue(session());
    await expect(
      service.submit(
        principal,
        session().id,
        dto({ text: 'Too short.' }),
        'submit-001',
      ),
    ).rejects.toMatchObject({ code: 'INVALID_CONTENT' });
    repository.findSession.mockResolvedValue(null);
    await expect(
      service.submit(principal, 'other-session', dto(), 'submit-002'),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    repository.findSession.mockResolvedValue(
      session({ status: 'FINALIZED', submission: submission() }),
    );
    repository.findSubmissionByIdempotency.mockResolvedValue(submission());
    expect(
      (await service.submit(principal, session().id, dto(), 'submit-001'))
        .replayed,
    ).toBe(true);
  });

  it('finalizes with safe learner metadata and never returns raw text', async () => {
    const finalized = session({
      status: 'FINALIZED',
      finalizedAt: new Date('2026-08-10T00:01:00.000Z'),
      submission: submission(),
    });
    repository.findSession.mockResolvedValue(session());
    repository.finalizeWithSubmission.mockResolvedValue({
      session: finalized,
      created: true,
    });
    const result = await service.submit(
      principal,
      session().id,
      dto(),
      'submit-001',
    );
    expect(result.session.submission).toEqual(
      expect.objectContaining({ wordCount: countWritingWords(text) }),
    );
    expect(JSON.stringify(result)).not.toContain(text);
    expect(repository.finalizeWithSubmission.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        userId: principal.applicationUserId,
        submittedText: text,
      }),
    );
  });
});
