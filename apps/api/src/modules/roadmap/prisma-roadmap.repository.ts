import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  RoadmapItemDraft,
  RoadmapItemStatus,
  RoadmapSeed,
  RoadmapView,
} from './roadmap.models';
import type { RoadmapRepository } from './roadmap.ports';

const roadmapInclude = {
  items: {
    orderBy: [{ dayNumber: 'asc' as const }, { sequence: 'asc' as const }],
  },
};

function toView(record: {
  id: string;
  version: number;
  goal: string;
  level: string;
  durationDays: number;
  dailyMinutes: number;
  status: string;
  previousRoadmapId: string | null;
  generatedAt: Date;
  items: Array<{
    id: string;
    dayNumber: number;
    sequence: number;
    phase: string;
    skill: string;
    taskType: string;
    title: string;
    minutes: number;
    status: string;
    completedAt: Date | null;
  }>;
}): RoadmapView {
  return {
    id: record.id,
    version: record.version,
    goal: record.goal as RoadmapView['goal'],
    level: record.level as RoadmapView['level'],
    durationDays: record.durationDays as RoadmapView['durationDays'],
    dailyMinutes: record.dailyMinutes,
    status: record.status as RoadmapView['status'],
    previousRoadmapId: record.previousRoadmapId,
    generatedAt: record.generatedAt,
    items: record.items as RoadmapView['items'],
  };
}

@Injectable()
export class PrismaRoadmapRepository implements RoadmapRepository {
  constructor(private readonly prisma: PrismaService) {}

  async loadSeed(userId: string): Promise<RoadmapSeed | null> {
    const [onboarding, placement] = await Promise.all([
      this.prisma.learnerOnboarding.findUnique({ where: { userId } }),
      this.prisma.placementAttempt.findFirst({
        where: { userId },
        orderBy: { submittedAt: 'desc' },
      }),
    ]);
    if (!onboarding || !placement) return null;
    return {
      goal: onboarding.primaryGoal,
      level: placement.level,
      durationDays: onboarding.targetDays as RoadmapSeed['durationDays'],
      dailyMinutes: onboarding.dailyMinutes,
      prioritySkills: onboarding.prioritySkills,
    };
  }

  async findCurrent(userId: string) {
    const record = await this.prisma.roadmap.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { version: 'desc' },
      include: roadmapInclude,
    });
    return record ? toView(record) : null;
  }

  async createVersion(
    userId: string,
    seed: RoadmapSeed,
    items: readonly RoadmapItemDraft[],
    replaceCurrent: boolean,
  ) {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const latest = await transaction.roadmap.findFirst({
          where: { userId },
          orderBy: { version: 'desc' },
        });
        const current = await transaction.roadmap.findFirst({
          where: { userId, status: 'ACTIVE' },
          orderBy: { version: 'desc' },
        });
        if (replaceCurrent && current) {
          await transaction.roadmap.update({
            where: { id: current.id },
            data: { status: 'SUPERSEDED', supersededAt: new Date() },
          });
        }
        const record = await transaction.roadmap.create({
          data: {
            userId,
            version: (latest?.version ?? 0) + 1,
            goal: seed.goal,
            level: seed.level,
            durationDays: seed.durationDays,
            dailyMinutes: seed.dailyMinutes,
            previousRoadmapId: replaceCurrent ? current?.id : undefined,
            items: { create: items.map((item) => ({ ...item })) },
          },
          include: roadmapInclude,
        });
        return toView(record);
      });
    } catch (error: unknown) {
      if (
        typeof error !== 'object' ||
        error === null ||
        !('code' in error) ||
        error.code !== 'P2002'
      ) {
        throw error;
      }
      const winner = await this.findCurrent(userId);
      if (!winner) throw error;
      return winner;
    }
  }

  async updateItem(userId: string, itemId: string, status: RoadmapItemStatus) {
    const result = await this.prisma.roadmapItem.updateMany({
      where: { id: itemId, roadmap: { userId, status: 'ACTIVE' } },
      data: {
        status,
        completedAt: status === 'COMPLETED' ? new Date() : null,
      },
    });
    if (result.count === 0) return null;
    return this.findCurrent(userId);
  }
}
