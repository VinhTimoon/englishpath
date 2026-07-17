import { PrismaService } from '../src/prisma/prisma.service';
import { PrismaOnboardingRepository } from '../src/modules/onboarding/prisma-onboarding.repository';

describe('PrismaOnboardingRepository placement idempotency', () => {
  const input = {
    userId: 'user-001',
    clientSubmissionId: 'submission-001',
    answers: [{ questionId: 'v1', optionId: 'a' }],
    score: 1,
    total: 1,
    level: 'BEGINNER' as const,
    skillBreakdown: { VOCABULARY: { correct: 1, total: 1 } },
  };
  const record = {
    id: 'attempt-001',
    score: 1,
    total: 1,
    level: 'BEGINNER',
    skillBreakdown: input.skillBreakdown,
    submittedAt: new Date('2026-07-17T00:00:00Z'),
  };

  function fixture() {
    const placementAttempt = {
      findUnique: jest.fn(),
      create: jest.fn(),
    };
    const repository = new PrismaOnboardingRepository({
      placementAttempt,
    } as unknown as PrismaService);
    return { placementAttempt, repository };
  }

  it('replays an existing owner and submission result without creating', async () => {
    const { placementAttempt, repository } = fixture();
    placementAttempt.findUnique.mockResolvedValue(record);

    await expect(repository.createPlacement(input)).resolves.toEqual(record);
    expect(placementAttempt.create).not.toHaveBeenCalled();
  });

  it('recovers the winning result when concurrent creates race', async () => {
    const { placementAttempt, repository } = fixture();
    placementAttempt.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(record);
    placementAttempt.create.mockRejectedValue({ code: 'P2002' });

    await expect(repository.createPlacement(input)).resolves.toEqual(record);
    expect(placementAttempt.findUnique).toHaveBeenCalledTimes(2);
  });
});
