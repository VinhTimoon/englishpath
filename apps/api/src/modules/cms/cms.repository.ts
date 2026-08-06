import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CmsRepository {
  constructor(private readonly prisma: PrismaService) {}

  listTaxonomy(parentId: string | undefined, skip: number, take: number) {
    return this.prisma.cmsTaxonomyNode.findMany({
      where: parentId === undefined ? {} : { parentId },
      orderBy: [{ level: 'asc' }, { topic: 'asc' }, { id: 'asc' }],
      skip,
      take,
    });
  }

  countTaxonomy(parentId: string | undefined) {
    return this.prisma.cmsTaxonomyNode.count({
      where: parentId === undefined ? {} : { parentId },
    });
  }

  findTaxonomy(id: string) {
    return this.prisma.cmsTaxonomyNode.findUnique({ where: { id } });
  }

  createTaxonomy(data: {
    id: string;
    parentId?: string;
    level: string;
    topic: string;
    subtopic?: string;
    collocations: string[];
    relatedSkills: string[];
    tracks: string[];
    toeicParts: number[];
    createdByActorId: string;
  }) {
    return this.prisma.cmsTaxonomyNode.create({ data });
  }

  findVersion(id: string) {
    return this.prisma.cmsContentVersion.findUnique({ where: { id } });
  }

  findVersionByRequest(contentId: string, clientRequestId: string) {
    return this.prisma.cmsContentVersion.findUnique({
      where: { contentId_clientRequestId: { contentId, clientRequestId } },
    });
  }

  createVersion(data: {
    id: string;
    contentId: string;
    previousVersionId?: string;
    clientRequestId: string;
    contentType: string;
    title: string;
    body: string;
    createdByActorId: string;
    provenance: string;
    usageScope: string;
    accessTier: string;
    taxonomyNodeId: string;
    sourceId: string;
    sourceUrl?: string;
    checksum: string;
    sourceVersion: string;
    rightsOwner: string;
    licenseStatus: string;
    allowedUsageScopes: string[];
    allowedAccessTiers: string[];
    validUntil?: Date;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await tx.cmsContent.upsert({
        where: { id: data.contentId },
        create: { id: data.contentId },
        update: {},
      });
      return tx.cmsContentVersion.create({ data });
    });
  }

  saveReview(
    id: string,
    data: {
      reviewStatus: string;
      reviewDecision: string;
      reviewerId: string;
      reviewedAt: Date;
      reviewContentId: string;
      reviewVersionId: string;
      reviewChecksum: string;
      reviewSourceVersion: string;
    },
  ) {
    return this.prisma.cmsContentVersion.update({ where: { id }, data });
  }

  savePublish(id: string, publishedAt: Date) {
    return this.prisma.cmsContentVersion.update({
      where: { id },
      data: { publishStatus: 'published', publishedAt },
    });
  }
}
