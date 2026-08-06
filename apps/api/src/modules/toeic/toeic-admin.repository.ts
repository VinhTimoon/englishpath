import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  TOEIC_ADMIN_SELECT,
  type ToeicAdminCreateInput,
  type ToeicAdminRecord,
  type ToeicAdminRepository,
  type ToeicPublishUpdate,
  type ToeicReviewUpdate,
} from './toeic-admin.models';

@Injectable()
export class PrismaToeicAdminRepository implements ToeicAdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByImportIdentity(importIdentity: string) {
    return this.prisma.toeicQuestionVersion.findUnique({
      where: { importIdentity },
      select: TOEIC_ADMIN_SELECT,
    });
  }

  findBySourceVersion(
    sourceIdentity: string,
    checksum: string,
    sourceVersion: string,
  ) {
    return this.prisma.toeicQuestionVersion.findUnique({
      where: {
        sourceIdentity_checksum_sourceVersion: {
          sourceIdentity,
          checksum,
          sourceVersion,
        },
      },
      select: TOEIC_ADMIN_SELECT,
    });
  }

  findByVersionId(id: string) {
    return this.prisma.toeicQuestionVersion.findUnique({
      where: { id },
      select: TOEIC_ADMIN_SELECT,
    });
  }

  findByQuestionVersion(questionId: string, version: number) {
    return this.prisma.toeicQuestionVersion.findUnique({
      where: { questionId_version: { questionId, version } },
      select: TOEIC_ADMIN_SELECT,
    });
  }

  async create(input: ToeicAdminCreateInput) {
    const data: Prisma.ToeicQuestionVersionUncheckedCreateInput = {
      ...input,
    };
    return this.prisma.$transaction(async (transaction) => {
      await transaction.toeicQuestion.upsert({
        where: { id: input.questionId },
        update: {},
        create: { id: input.questionId },
      });
      return transaction.toeicQuestionVersion.create({
        data,
        select: TOEIC_ADMIN_SELECT,
      });
    });
  }

  async review(
    id: string,
    expected: Readonly<{ checksum: string; sourceVersion: string }>,
    update: ToeicReviewUpdate,
  ): Promise<ToeicAdminRecord | null> {
    const result = await this.prisma.toeicQuestionVersion.updateMany({
      where: {
        id,
        checksum: expected.checksum,
        sourceVersion: expected.sourceVersion,
        reviewStatus: 'DRAFT',
        publicationState: 'UNPUBLISHED',
      },
      data: update,
    });
    if (result.count !== 1) return null;
    return this.findByVersionId(id);
  }

  async publish(
    id: string,
    expected: Readonly<{ checksum: string; sourceVersion: string }>,
    update: ToeicPublishUpdate,
  ): Promise<ToeicAdminRecord | null> {
    const result = await this.prisma.toeicQuestionVersion.updateMany({
      where: {
        id,
        checksum: expected.checksum,
        sourceVersion: expected.sourceVersion,
        reviewStatus: 'REVIEWED',
        reviewDecision: 'APPROVE',
        publicationState: 'UNPUBLISHED',
        licenseStatus: 'APPROVED',
      },
      data: update,
    });
    if (result.count !== 1) return null;
    return this.findByVersionId(id);
  }
}
