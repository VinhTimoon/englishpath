import { createApplicationPrincipal, createExternalIdentity } from '../access';
import type { PracticeRepository } from './practice.ports';
import { PracticeService } from './practice.service';

describe('PracticeService', () => {
  const principal = createApplicationPrincipal({
    applicationUserId: 'user-001',
    externalIdentity: createExternalIdentity({
      provider: 'SUPABASE',
      subject: 'subject',
      issuer: 'issuer',
      audience: 'authenticated',
    }),
    roles: ['FREE_USER'],
    ownerships: [],
    entitlements: [],
  });
  const state = {
    id: 'session-001',
    status: 'ACTIVE' as const,
    answeredQuestionIds: [],
    score: 0,
    total: 5,
    xpAwarded: 0,
    streakDays: 0,
    errors: [],
  };
  const repository: jest.Mocked<PracticeRepository> = {
    start: jest.fn(),
    answer: jest.fn(),
    submit: jest.fn(),
    result: jest.fn(),
  };

  beforeEach(() => {
    repository.start.mockResolvedValue(state);
    repository.answer.mockResolvedValue({
      session: state,
      selectedOption: 'b',
      isCorrect: false,
    });
  });

  it('starts five cards without exposing keys or explanations', async () => {
    const result = await new PracticeService(repository).start(
      principal,
      'client-session',
    );
    expect(result.questions).toHaveLength(5);
    expect(JSON.stringify(result.questions)).not.toMatch(
      /correctOption|explanation/,
    );
    expect(repository.start.mock.calls[0]?.[0]).toBe('user-001');
  });

  it('grades an answer on the server and returns concise feedback', async () => {
    const result = await new PracticeService(repository).answer(
      principal,
      'session-001',
      { questionId: 'p1', selectedOption: 'b' },
    );
    expect(result.feedback.isCorrect).toBe(false);
    expect(repository.answer.mock.calls[0]?.[2]).toEqual(
      expect.objectContaining({ isCorrect: false, correctOption: 'a' }),
    );
  });
});
