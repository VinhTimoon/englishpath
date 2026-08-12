jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { PrismaAiFeedbackUsageRepository } from './ai-feedback.repository';

describe('PrismaAiFeedbackUsageRepository', () => {
  it('aggregates only server-owned scalar usage fields without selecting learner data', async () => {
    const db = {
      aiFeedbackUsage: {
        count: jest.fn().mockResolvedValue(4),
        groupBy: jest
          .fn()
          .mockResolvedValueOnce([
            { outcome: 'ALLOWED', _count: { _all: 2 } },
            { outcome: 'DENIED', _count: { _all: 1 } },
            { outcome: 'PROVIDER_UNAVAILABLE', _count: { _all: 1 } },
          ])
          .mockResolvedValueOnce([
            { feature: 'EXPLANATION', _count: { _all: 4 } },
          ])
          .mockResolvedValueOnce([
            { skill: 'EXPLANATION', _count: { _all: 4 } },
          ]),
        aggregate: jest.fn().mockResolvedValue({
          _sum: { estimatedCostMicros: 0 },
        }),
      },
    };
    const repository = new PrismaAiFeedbackUsageRepository(db as never);

    await expect(
      repository.aggregateSince(new Date('2026-08-12T00:00:00Z')),
    ).resolves.toEqual({
      totalRequests: 4,
      outcomes: [
        { key: 'ALLOWED', count: 2 },
        { key: 'DENIED', count: 1 },
        { key: 'PROVIDER_UNAVAILABLE', count: 1 },
      ],
      features: [{ key: 'EXPLANATION', count: 4 }],
      skills: [{ key: 'EXPLANATION', count: 4 }],
      estimatedCostMicros: 0,
    });
    expect(db.aiFeedbackUsage.groupBy).toHaveBeenCalledTimes(3);
    const aggregateMock = Reflect.get(db.aiFeedbackUsage.aggregate, 'mock') as {
      calls: unknown[][];
    };
    const aggregateArgs = aggregateMock.calls[0]?.[0] as
      | {
          where?: { createdAt?: { gte?: unknown } };
          _sum?: { estimatedCostMicros?: boolean };
        }
      | undefined;
    expect(aggregateArgs?.where?.createdAt?.gte).toBeInstanceOf(Date);
    expect(aggregateArgs?._sum).toEqual({ estimatedCostMicros: true });
  });
});
