import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { OnboardingInput, PlacementResult } from './onboarding.models';
import type { OnboardingRepository } from './onboarding.ports';

function toResult(record: {
  id: string;
  score: number;
  total: number;
  level: string;
  skillBreakdown: unknown;
  submittedAt: Date;
}): PlacementResult {
  return {
    id: record.id,
    score: record.score,
    total: record.total,
    level: record.level as PlacementResult['level'],
    skillBreakdown: record.skillBreakdown as PlacementResult['skillBreakdown'],
    submittedAt: record.submittedAt,
  };
}

@Injectable()
export class PrismaOnboardingRepository implements OnboardingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(userId: string) {
    const record = await this.prisma.learnerOnboarding.findUnique({
      where: { userId },
    });
    if (!record) return null;
    return {
      primaryGoal: record.primaryGoal,
      secondaryGoals:
        record.secondaryGoals as OnboardingInput['secondaryGoals'],
      currentLevel: record.currentLevel,
      dailyMinutes: record.dailyMinutes,
      targetDays: record.targetDays as OnboardingInput['targetDays'],
      prioritySkills:
        record.prioritySkills as OnboardingInput['prioritySkills'],
      completedAt: record.completedAt,
    };
  }

  async upsert(userId: string, input: OnboardingInput) {
    const data = {
      primaryGoal: input.primaryGoal,
      secondaryGoals: [...input.secondaryGoals],
      currentLevel: input.currentLevel,
      dailyMinutes: input.dailyMinutes,
      targetDays: input.targetDays,
      prioritySkills: [...input.prioritySkills],
    };
    const record = await this.prisma.learnerOnboarding.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    return { ...input, completedAt: record.completedAt };
  }

  async findLatestPlacement(userId: string) {
    const record = await this.prisma.placementAttempt.findFirst({
      where: { userId },
      orderBy: { submittedAt: 'desc' },
    });
    return record ? toResult(record) : null;
  }

  async createPlacement(
    input: Parameters<OnboardingRepository['createPlacement']>[0],
  ) {
    const where = {
      userId_clientSubmissionId: {
        userId: input.userId,
        clientSubmissionId: input.clientSubmissionId,
      },
    };
    const existing = await this.prisma.placementAttempt.findUnique({ where });
    if (existing) return toResult(existing);
    try {
      return toResult(
        await this.prisma.placementAttempt.create({
          data: {
            ...input,
            answers: input.answers as never,
            skillBreakdown: input.skillBreakdown as never,
          },
        }),
      );
    } catch (error: unknown) {
      if (
        typeof error !== 'object' ||
        error === null ||
        !('code' in error) ||
        error.code !== 'P2002'
      )
        throw error;
      const raced = await this.prisma.placementAttempt.findUnique({ where });
      if (!raced) throw error;
      return toResult(raced);
    }
  }
}
