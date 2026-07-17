import { createApplicationPrincipal, createExternalIdentity } from '../access';
import type { OnboardingRepository } from './onboarding.ports';
import { OnboardingService } from './onboarding.service';

describe('OnboardingService learner entry bundle', () => {
  const principal = createApplicationPrincipal({
    applicationUserId: 'application-user-001',
    externalIdentity: createExternalIdentity({
      provider: 'SUPABASE',
      subject: 'external-user-001',
      issuer: 'issuer',
      audience: 'authenticated',
    }),
    roles: ['FREE_USER'],
    ownerships: [],
    entitlements: [],
  });

  function fixture() {
    const completedAt = new Date('2026-07-17T00:00:00Z');
    const repository: jest.Mocked<OnboardingRepository> = {
      find: jest.fn(),
      upsert: jest.fn().mockResolvedValue({
        primaryGoal: 'ENGLISH_FOUNDATION',
        secondaryGoals: ['DAILY_COMMUNICATION'],
        currentLevel: 'BEGINNER',
        dailyMinutes: 20,
        targetDays: 90,
        prioritySkills: ['VOCABULARY'],
        completedAt,
      }),
      findLatestPlacement: jest.fn(),
      createPlacement: jest.fn().mockResolvedValue({
        id: 'attempt-001',
        score: 10,
        total: 10,
        level: 'ADVANCED',
        skillBreakdown: {},
        submittedAt: completedAt,
      }),
    };
    return { repository, service: new OnboardingService(repository) };
  }

  it('persists onboarding only for the authenticated principal', async () => {
    const { repository, service } = fixture();
    const input = {
      primaryGoal: 'ENGLISH_FOUNDATION',
      secondaryGoals: ['DAILY_COMMUNICATION'],
      currentLevel: 'BEGINNER',
      dailyMinutes: 20,
      targetDays: 90,
      prioritySkills: ['VOCABULARY'],
    } as const;
    await service.submitOnboarding(principal, input);
    expect(repository.upsert.mock.calls[0]).toEqual([
      'application-user-001',
      input,
    ]);
  });

  it('never returns answer keys and grades a complete submission server-side', async () => {
    const { repository, service } = fixture();
    const questions = service.getQuestions();
    expect(JSON.stringify(questions)).not.toMatch(/answer|correct/i);
    const correctOptions: Record<string, string> = {
      v1: 'a',
      v2: 'b',
      v3: 'a',
      g1: 'a',
      g2: 'c',
      g3: 'a',
      r1: 'a',
      r2: 'b',
      r3: 'a',
      r4: 'c',
    };
    const answers = questions.map(({ id }) => ({
      questionId: id,
      optionId: correctOptions[id],
    }));
    await service.submitPlacement(principal, 'submission-001', answers);
    expect(repository.createPlacement.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        userId: 'application-user-001',
        score: 10,
        total: 10,
        level: 'ADVANCED',
      }),
    );
  });

  it('rejects duplicate or unknown placement questions', () => {
    const { service } = fixture();
    const invalid = Array.from({ length: 10 }, () => ({
      questionId: 'v1',
      optionId: 'a',
    }));
    expect(() =>
      service.submitPlacement(principal, 'submission-002', invalid),
    ).toThrow();
  });
});
