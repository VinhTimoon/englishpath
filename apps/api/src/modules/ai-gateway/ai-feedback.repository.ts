import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AiFeedbackUsage } from '../../generated/prisma/client';
import type {
  AiFeedbackUsageRepository,
  FeedbackUsageCreate,
  FeedbackUsageRecord,
} from './ai-feedback.models';

type FeedbackDb = {
  aiFeedbackUsage: {
    findUnique(args: Record<string, unknown>): Promise<unknown>;
    findFirst(args: Record<string, unknown>): Promise<unknown>;
    count(args: Record<string, unknown>): Promise<number>;
    create(args: Record<string, unknown>): Promise<unknown>;
  };
};

const SELECT = {
  id: true,
  userId: true,
  feature: true,
  skill: true,
  policyVersion: true,
  promptVersion: true,
  adapterKind: true,
  modelVersion: true,
  idempotencyKey: true,
  requestFingerprint: true,
  outcome: true,
  estimatedCostMicros: true,
  quotaRemaining: true,
  feedbackJson: true,
  correlationId: true,
  createdAt: true,
} as const;

function asRecord(value: unknown): FeedbackUsageRecord {
  const row = value as AiFeedbackUsage & { feedbackJson?: unknown };
  return {
    id: row.id,
    userId: row.userId,
    feature: row.feature as FeedbackUsageRecord['feature'],
    skill: row.skill as FeedbackUsageRecord['skill'],
    policyVersion: row.policyVersion,
    promptVersion: row.promptVersion,
    adapterKind: row.adapterKind,
    modelVersion: row.modelVersion,
    idempotencyKey: row.idempotencyKey,
    requestFingerprint: row.requestFingerprint,
    outcome: row.outcome,
    estimatedCostMicros: row.estimatedCostMicros,
    quotaRemaining: row.quotaRemaining,
    feedback: (row.feedbackJson as FeedbackUsageRecord['feedback']) ?? null,
    correlationId: row.correlationId,
    createdAt: row.createdAt,
  };
}

@Injectable()
export class PrismaAiFeedbackUsageRepository implements AiFeedbackUsageRepository {
  private readonly db: FeedbackDb;

  constructor(prisma: PrismaService) {
    this.db = prisma as unknown as FeedbackDb;
  }

  async findByIdempotency(userId: string, idempotencyKey: string) {
    const row = await this.db.aiFeedbackUsage.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
      select: SELECT,
    });
    return row ? asRecord(row) : null;
  }

  async findAnyByIdempotency(idempotencyKey: string) {
    const row = await this.db.aiFeedbackUsage.findFirst({
      where: { idempotencyKey },
      select: SELECT,
    });
    return row ? asRecord(row) : null;
  }

  countSince(userId: string, since: Date) {
    return this.db.aiFeedbackUsage.count({
      where: { userId, createdAt: { gte: since } },
    });
  }

  async create(input: FeedbackUsageCreate) {
    const row = await this.db.aiFeedbackUsage.create({
      data: {
        userId: input.userId,
        feature: input.feature,
        skill: input.skill,
        policyVersion: input.policyVersion,
        promptVersion: input.promptVersion,
        adapterKind: input.adapterKind,
        modelVersion: input.modelVersion,
        idempotencyKey: input.idempotencyKey,
        requestFingerprint: input.requestFingerprint,
        outcome: input.outcome,
        estimatedCostMicros: input.estimatedCostMicros,
        quotaRemaining: input.quotaRemaining,
        feedbackJson: input.feedback,
        correlationId: input.correlationId,
      },
      select: SELECT,
    });
    return asRecord(row);
  }
}
