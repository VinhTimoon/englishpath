import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaRoadmapRepository } from '../src/modules/roadmap/prisma-roadmap.repository';
import type { RoadmapSeed } from '../src/modules/roadmap/roadmap.models';
import { PrismaService } from '../src/prisma/prisma.service';

const seed: RoadmapSeed = {
  goal: 'ENGLISH_FOUNDATION',
  level: 'BEGINNER',
  durationDays: 30,
  dailyMinutes: 20,
  prioritySkills: [],
};
const record = {
  id: 'roadmap-001',
  userId: 'user-001',
  version: 1,
  goal: 'ENGLISH_FOUNDATION',
  level: 'BEGINNER',
  durationDays: 30,
  dailyMinutes: 20,
  status: 'ACTIVE',
  previousRoadmapId: null,
  generatedAt: new Date(),
  supersededAt: null,
  items: [],
};

describe('Roadmap concurrency boundaries', () => {
  function fixture() {
    const client = {
      roadmap: { findFirst: jest.fn() },
      roadmapItem: { updateMany: jest.fn() },
      $transaction: jest.fn(),
    };
    return {
      client,
      repository: new PrismaRoadmapRepository(
        client as unknown as PrismaService,
      ),
    };
  }

  it('enforces one active roadmap per user in PostgreSQL', () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        'prisma/migrations/20260717183000_roadmap_today/migration.sql',
      ),
      'utf8',
    );
    expect(migration).toContain(
      'UNIQUE INDEX "Roadmap_one_active_per_user_key"',
    );
    expect(migration).toContain('WHERE "status" = \'ACTIVE\'');
  });

  it('returns the active winner after a concurrent unique conflict', async () => {
    const { client, repository } = fixture();
    client.$transaction.mockRejectedValue({ code: 'P2002' });
    client.roadmap.findFirst.mockResolvedValue(record);

    await expect(
      repository.createVersion('user-001', seed, [], false),
    ).resolves.toEqual(expect.objectContaining({ id: 'roadmap-001' }));
  });

  it('recovers the same active winner for concurrent successor attempts', async () => {
    const { client, repository } = fixture();
    client.$transaction
      .mockRejectedValueOnce({ code: 'P2002' })
      .mockRejectedValueOnce({ code: 'P2002' });
    client.roadmap.findFirst.mockResolvedValue(record);

    await expect(
      Promise.all([
        repository.createVersion('user-001', seed, [], true),
        repository.createVersion('user-001', seed, [], true),
      ]),
    ).resolves.toEqual([
      expect.objectContaining({ id: 'roadmap-001' }),
      expect.objectContaining({ id: 'roadmap-001' }),
    ]);
    expect(client.roadmap.findFirst).toHaveBeenCalledTimes(2);
  });

  it('preserves successor lineage and item bounds inside the transaction', async () => {
    const { client, repository } = fixture();
    const transaction = {
      roadmap: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ version: 1 })
          .mockResolvedValueOnce(record),
        update: jest.fn().mockResolvedValue(record),
        create: jest.fn().mockResolvedValue({
          ...record,
          id: 'roadmap-002',
          version: 2,
          previousRoadmapId: 'roadmap-001',
          items: [],
        }),
      },
    };
    client.$transaction.mockImplementation(
      (callback: (value: typeof transaction) => unknown) =>
        Promise.resolve(callback(transaction)),
    );
    const items = [
      {
        dayNumber: 2,
        sequence: 4,
        phase: 'SKILL_BUILDING' as const,
        skill: 'READING' as const,
        taskType: 'READING' as const,
        title: 'Reading',
        minutes: 12,
        status: 'PENDING' as const,
        completedAt: null,
      },
    ];

    await repository.createVersion('user-001', seed, items, true);

    const updateCalls = transaction.roadmap.update as unknown as {
      mock: { calls: unknown[][] };
    };
    const updateCall = updateCalls.mock.calls[0]?.[0] as
      | {
          where: { id: string };
          data: { status: string; supersededAt: Date };
        }
      | undefined;
    expect(updateCall?.where).toEqual({ id: 'roadmap-001' });
    expect(updateCall?.data.status).toBe('SUPERSEDED');
    expect(updateCall?.data.supersededAt).toBeInstanceOf(Date);
    const createCalls = transaction.roadmap.create as unknown as {
      mock: { calls: unknown[][] };
    };
    const createCall = createCalls.mock.calls[0]?.[0] as
      | {
          data: {
            previousRoadmapId: string;
            items: { create: typeof items };
          };
        }
      | undefined;
    expect(createCall?.data.previousRoadmapId).toBe('roadmap-001');
    expect(createCall?.data.items.create).toEqual(items);
  });

  it('authorizes and updates a task in one owner-active statement', async () => {
    const { client, repository } = fixture();
    client.roadmapItem.updateMany.mockResolvedValue({ count: 1 });
    client.roadmap.findFirst.mockResolvedValue({
      ...record,
      items: [
        {
          id: 'item-001',
          dayNumber: 1,
          sequence: 1,
          phase: 'FOUNDATION',
          skill: 'VOCABULARY',
          taskType: 'VOCABULARY',
          title: 'Vocabulary',
          minutes: 7,
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      ],
    });

    await repository.updateItem('user-001', 'item-001', 'COMPLETED');
    expect(client.roadmapItem.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'item-001',
          roadmap: { userId: 'user-001', status: 'ACTIVE' },
        },
      }),
    );
  });
});
