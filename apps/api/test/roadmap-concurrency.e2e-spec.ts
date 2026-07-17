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
