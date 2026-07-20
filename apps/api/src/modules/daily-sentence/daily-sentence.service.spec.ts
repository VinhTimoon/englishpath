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
      submittedAnswer: 'Practice',
      isCorrect: true,
      feedback: 'Saved',
      completedAt: new Date('2026-01-01'),
    });
    const replay = await service.submit(principal, 'ds-001', 'Different');
    expect(replay.feedback?.message).toBe('Saved');
    expect(repo.complete.mock.calls).toHaveLength(1);
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

    expect(repo.profileTimezone.mock.calls).toEqual([['user-1']]);
    expect(repo.eligibleSentences.mock.calls).toEqual([[expect.any(Date)]]);
    expect(repo.completion.mock.calls).toEqual([['user-1', expect.any(Date)]]);
    expect(result.sentence?.prompt).not.toContain(
      'Practice for a few minutes.',
    );
  });
});
