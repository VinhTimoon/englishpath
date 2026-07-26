import { DailySentenceService } from './daily-sentence.service';
import type { DailySentenceRepository } from './daily-sentence.ports';
import { createApplicationPrincipal } from '../access';

const principal = createApplicationPrincipal({
  applicationUserId: 'user-1',
  externalIdentity: {
    provider: 'test',
    subject: 'subject-1',
    issuer: 'issuer',
    audience: 'audience',
  },
  roles: ['learner'],
  ownerships: [],
  entitlements: [],
});
function repository(): jest.Mocked<DailySentenceRepository> {
  return {
    profileTimezone: jest.fn().mockResolvedValue('Asia/Ho_Chi_Minh'),
    eligibleSentences: jest.fn().mockResolvedValue([
      {
        id: 'ds-001',
        prompt: 'Translate this idea into English: practise for a few minutes.',
        expectedAnswer: 'Practice for a few minutes.',
      },
    ]),
    completion: jest.fn().mockResolvedValue(null),
    complete: jest.fn().mockResolvedValue({
      sentence: {
        id: 'ds-001',
        prompt: 'Translate this idea into English: practise for a few minutes.',
        expectedAnswer: 'Practice for a few minutes.',
      },
      submittedAnswer: 'Practice',
      isCorrect: true,
      feedback: 'Correct',
      completedAt: new Date('2026-01-01'),
    }),
  };
}

describe('DailySentenceService', () => {
  it('does not expose the expected answer before completion', async () => {
    const result = await new DailySentenceService(repository()).today(
      principal,
    );
    expect(result).toEqual(expect.objectContaining({ completed: false }));
    expect(JSON.stringify(result)).not.toContain('expectedAnswer');
  });
  it('returns persisted feedback and does not complete twice', async () => {
    const repo = repository();
    const service = new DailySentenceService(repo);
    await service.submit(principal, 'ds-001', 'Practice');
    repo.completion.mockResolvedValue({
      sentence: {
        id: 'ds-001',
        prompt: 'Translate this idea into English: practise for a few minutes.',
        expectedAnswer: 'Practice for a few minutes.',
      },
      submittedAnswer: 'Practice',
      isCorrect: true,
      feedback: 'Saved',
      completedAt: new Date('2026-01-01'),
    });
    const replay = await service.submit(principal, 'ds-001', 'Different');
    expect(replay.feedback?.message).toBe('Saved');
    expect(repo.complete.mock.calls).toHaveLength(1);
  });
  it('keeps the persisted assignment when eligible content changes', async () => {
    const repo = repository();
    repo.completion.mockResolvedValue({
      sentence: {
        id: 'ds-001',
        prompt: 'Persisted prompt.',
        expectedAnswer: 'Persisted answer.',
      },
      submittedAnswer: 'Persisted answer.',
      isCorrect: true,
      feedback: 'Saved',
      completedAt: new Date('2026-01-01'),
    });
    repo.eligibleSentences.mockResolvedValue([
      {
        id: 'ds-002',
        prompt: 'Newly published prompt.',
        expectedAnswer: 'New answer.',
      },
    ]);

    const result = await new DailySentenceService(repo).today(principal);

    expect(result.sentence).toEqual({
      id: 'ds-001',
      prompt: 'Persisted prompt.',
    });
    expect(repo.eligibleSentences.mock.calls).toHaveLength(0);
  });
  it('replays the persisted assignment even when today selects a different sentence', async () => {
    const repo = repository();
    repo.completion.mockResolvedValue({
      sentence: {
        id: 'ds-001',
        prompt: 'Persisted prompt.',
        expectedAnswer: 'Persisted answer.',
      },
      submittedAnswer: 'Persisted answer.',
      isCorrect: true,
      feedback: 'Saved',
      completedAt: new Date('2026-01-01'),
    });
    repo.eligibleSentences.mockResolvedValue([
      { id: 'ds-002', prompt: 'New prompt.', expectedAnswer: 'New answer.' },
    ]);

    const replay = await new DailySentenceService(repo).submit(
      principal,
      'ds-001',
      'Different answer',
    );

    expect(replay.sentence).toEqual({
      id: 'ds-001',
      prompt: 'Persisted prompt.',
    });
    expect(repo.eligibleSentences.mock.calls).toHaveLength(0);
  });
  it('returns an empty state when no eligible content exists', async () => {
    const repo = repository();
    repo.eligibleSentences.mockResolvedValue([]);
    expect(
      (await new DailySentenceService(repo).today(principal)).sentence,
    ).toBeNull();
  });

  it('uses the owner and stored timezone for each request', async () => {
    const repo = repository();
    repo.profileTimezone.mockResolvedValue('America/Los_Angeles');
    const result = await new DailySentenceService(repo).today(principal);

    expect(repo.profileTimezone.mock.calls).toEqual([['user-1'], ['user-1']]);
    expect(repo.eligibleSentences.mock.calls).toEqual([[expect.any(Date)]]);
    expect(repo.completion.mock.calls).toEqual([['user-1', expect.any(Date)]]);
    expect(result.sentence?.prompt).not.toContain(
      'Practice for a few minutes.',
    );
  });
});
