import { Injectable } from '@nestjs/common';
import {
  AccessError,
  ACCESS_ERROR_CODES,
  type ApplicationPrincipal,
} from '../access';
import { AuditService } from '../audit/audit.service';
import {
  authorizeHumanContentAction,
  CONTENT_GOVERNANCE_ERROR_CODES,
  ContentGovernanceError,
  createGovernedContentVersion,
  createSharedTaxonomy,
  publishContentVersion,
  reviewContentVersion,
  reviseContentVersion,
  type ContentAuthorizationAction,
  type ContentProvenance,
  type ContentAccessTier,
  type ContentUsageScope,
  type LicenseStatus,
  type GovernedContentVersion,
  type ReviewEvidence,
} from '../content-governance';
import { CmsRepository } from './cms.repository';
import type {
  CmsContentVersion,
  CmsTaxonomyNode,
} from '../../generated/prisma/client';
import {
  CreateContentVersionDto,
  CreateTaxonomyNodeDto,
  CmsTaxonomyQueryDto,
  PublishContentVersionDto,
  ReviewContentVersionDto,
} from './dto/cms.dto';

const EDITOR_ROLES = ['CONTENT_EDITOR', 'ADMIN', 'SUPER_ADMIN'] as const;
const PUBLISH_ROLES = ['ADMIN', 'SUPER_ADMIN'] as const;

function isGovernanceError(error: unknown): error is { code: string } {
  return (
    error instanceof Error &&
    error.name === 'ContentGovernanceError' &&
    typeof (error as { code?: unknown }).code === 'string'
  );
}

function hasRole(principal: ApplicationPrincipal, roles: readonly string[]) {
  return roles.some((role) => principal.roles.includes(role));
}

@Injectable()
export class CmsService {
  constructor(
    private readonly repository: CmsRepository,
    private readonly audit: AuditService,
  ) {}

  async listTaxonomy(
    principal: ApplicationPrincipal,
    query: CmsTaxonomyQueryDto,
    correlationId: string,
  ) {
    await this.requireRole(
      principal,
      EDITOR_ROLES,
      correlationId,
      'taxonomy.list',
    );
    const limit = Math.min(query.limit ?? 20, 100);
    const offset = query.offset ?? 0;
    const [nodes, total] = await Promise.all([
      this.repository.listTaxonomy(query.parentId, offset, limit),
      this.repository.countTaxonomy(query.parentId),
    ]);
    return {
      data: nodes.map((node) => this.taxonomyView(node)),
      pagination: {
        limit,
        offset,
        total,
        hasNext: offset + nodes.length < total,
      },
    };
  }

  async createTaxonomy(
    principal: ApplicationPrincipal,
    input: CreateTaxonomyNodeDto,
    correlationId: string,
  ) {
    await this.requireRole(
      principal,
      EDITOR_ROLES,
      correlationId,
      'taxonomy.create',
    );
    if (input.parentId === input.id) {
      throw new Error('Invalid taxonomy parent.');
    }
    if (
      input.parentId &&
      !(await this.repository.findTaxonomy(input.parentId))
    ) {
      throw new Error('Invalid taxonomy parent.');
    }
    const taxonomy = createSharedTaxonomy({
      ...input,
      subtopic: input.subtopic ?? undefined,
    });
    const node = await this.repository.createTaxonomy({
      id: input.id.trim(),
      parentId: input.parentId?.trim(),
      level: taxonomy.level,
      topic: taxonomy.topic,
      subtopic: taxonomy.subtopic,
      collocations: [...taxonomy.collocations],
      relatedSkills: [...taxonomy.relatedSkills],
      tracks: [...taxonomy.tracks],
      toeicParts: [...taxonomy.toeicParts],
      createdByActorId: principal.applicationUserId,
    });
    await this.auditMutation(
      principal,
      correlationId,
      'cms.taxonomy.create',
      `cms.taxonomy:${node.id}`,
      'created',
    );
    return this.taxonomyView(node);
  }

  async createVersion(
    principal: ApplicationPrincipal,
    input: CreateContentVersionDto,
    correlationId: string,
  ) {
    await this.requireRole(
      principal,
      EDITOR_ROLES,
      correlationId,
      'content.create',
    );
    const taxonomyRow = await this.repository.findTaxonomy(
      input.taxonomyNodeId,
    );
    if (!taxonomyRow) {
      throw new Error('Invalid taxonomy.');
    }
    const existing = await this.repository.findVersionByRequest(
      input.contentId,
      input.clientRequestId,
    );
    if (existing) {
      return {
        data: this.versionView(existing),
        idempotencyStatus: 'replayed' as const,
      };
    }

    const baseInput = this.governanceInput(principal, input, taxonomyRow);
    try {
      if (input.previousVersionId) {
        const previousRow = await this.repository.findVersion(
          input.previousVersionId,
        );
        if (!previousRow || previousRow.contentId !== input.contentId) {
          throw new Error('Invalid revision lineage.');
        }
        const previous = this.toGoverned(previousRow, taxonomyRow);
        reviseContentVersion(previous, {
          versionId: input.versionId,
          checksum: input.checksum,
          sourceVersion: input.sourceVersion,
          sourceUrl: input.sourceUrl,
          createdByActorId: principal.applicationUserId,
        });
      }
      createGovernedContentVersion(baseInput);
    } catch (error) {
      if (isGovernanceError(error)) {
        await this.auditDenied(
          principal,
          correlationId,
          'cms.content.create',
          `cms.content:${input.contentId}`,
          error.code,
        );
      }
      throw error;
    }

    try {
      const version = await this.repository.createVersion({
        id: input.versionId.trim(),
        contentId: input.contentId.trim(),
        previousVersionId: input.previousVersionId?.trim(),
        clientRequestId: input.clientRequestId.trim(),
        contentType: input.contentType.trim(),
        title: input.title.trim(),
        body: input.body.trim(),
        createdByActorId: principal.applicationUserId,
        provenance: input.provenance,
        usageScope: input.usageScope,
        accessTier: input.accessTier,
        taxonomyNodeId: input.taxonomyNodeId.trim(),
        sourceId: input.sourceId.trim(),
        sourceUrl: input.sourceUrl?.trim(),
        checksum: input.checksum.trim(),
        sourceVersion: input.sourceVersion.trim(),
        rightsOwner: input.rightsOwner.trim(),
        licenseStatus: input.licenseStatus,
        allowedUsageScopes: input.allowedUsageScopes,
        allowedAccessTiers: input.allowedAccessTiers,
        validUntil: input.validUntil ? new Date(input.validUntil) : undefined,
      });
      await this.auditMutation(
        principal,
        correlationId,
        'cms.content.create',
        `cms.content:${version.contentId}`,
        'draft_created',
      );
      return {
        data: this.versionView(version),
        idempotencyStatus: 'created' as const,
      };
    } catch (error) {
      const replay = await this.repository.findVersionByRequest(
        input.contentId,
        input.clientRequestId,
      );
      if (replay) {
        return {
          data: this.versionView(replay),
          idempotencyStatus: 'replayed' as const,
        };
      }
      throw error;
    }
  }

  async getVersion(
    principal: ApplicationPrincipal,
    id: string,
    correlationId: string,
  ) {
    await this.requireRole(
      principal,
      EDITOR_ROLES,
      correlationId,
      'content.read',
    );
    const version = await this.repository.findVersion(id);
    if (!version) throw new Error('Content version not found.');
    return this.versionView(version);
  }

  async reviewVersion(
    principal: ApplicationPrincipal,
    id: string,
    input: ReviewContentVersionDto,
    correlationId: string,
  ) {
    await this.requireRole(
      principal,
      EDITOR_ROLES,
      correlationId,
      'content.review',
    );
    const row = await this.repository.findVersion(id);
    if (!row) throw new Error('Content version not found.');
    this.assertReviewable(row);
    const taxonomy = await this.repository.findTaxonomy(row.taxonomyNodeId);
    if (!taxonomy) throw new Error('Invalid taxonomy.');
    const evidence: ReviewEvidence = {
      reviewerId: principal.applicationUserId,
      decision: input.decision,
      reviewedAt: input.reviewedAt,
      contentId: input.contentId,
      versionId: input.versionId,
      checksum: input.checksum,
      sourceVersion: input.sourceVersion,
    };
    try {
      const reviewed = reviewContentVersion(
        this.toGoverned(row, taxonomy),
        evidence,
        this.authorize(principal, 'review'),
      );
      const saved = await this.repository.saveReview(row.id, {
        reviewStatus: reviewed.reviewStatus,
        reviewDecision: evidence.decision,
        reviewerId: evidence.reviewerId,
        reviewedAt: new Date(evidence.reviewedAt),
        reviewContentId: evidence.contentId,
        reviewVersionId: evidence.versionId,
        reviewChecksum: evidence.checksum,
        reviewSourceVersion: evidence.sourceVersion,
      });
      await this.auditMutation(
        principal,
        correlationId,
        'cms.content.review',
        `cms.version:${row.id}`,
        evidence.decision,
      );
      return this.versionView(saved);
    } catch (error) {
      if (isGovernanceError(error)) {
        await this.auditDenied(
          principal,
          correlationId,
          'cms.content.review',
          `cms.version:${row.id}`,
          error.code,
        );
      }
      throw error;
    }
  }

  async publishVersion(
    principal: ApplicationPrincipal,
    id: string,
    _input: PublishContentVersionDto,
    correlationId: string,
  ) {
    await this.requireRole(
      principal,
      PUBLISH_ROLES,
      correlationId,
      'content.publish',
    );
    const row = await this.repository.findVersion(id);
    if (!row) throw new Error('Content version not found.');
    this.assertPersistedLifecycle(row);
    if (row.publishStatus === 'published') {
      throw new Error('Content version is already published.');
    }
    const taxonomy = await this.repository.findTaxonomy(row.taxonomyNodeId);
    if (!taxonomy) throw new Error('Invalid taxonomy.');
    try {
      const base = this.toGoverned(row, taxonomy);
      const reviewed =
        row.reviewStatus === 'draft'
          ? base
          : reviewContentVersion(
              base,
              this.persistedEvidence(row),
              authorizeHumanContentAction(
                {
                  authorizeHumanAction: () => row.reviewerId,
                },
                'review',
              ),
            );
      publishContentVersion(reviewed, {
        authorization: this.authorize(principal, 'publish'),
      });
      const saved = await this.repository.savePublish(row.id, new Date());
      await this.auditMutation(
        principal,
        correlationId,
        'cms.content.publish',
        `cms.version:${row.id}`,
        'published',
      );
      return this.versionView(saved);
    } catch (error) {
      if (isGovernanceError(error)) {
        await this.auditDenied(
          principal,
          correlationId,
          'cms.content.publish',
          `cms.version:${row.id}`,
          error.code,
        );
      }
      throw error;
    }
  }

  private governanceInput(
    principal: ApplicationPrincipal,
    input: CreateContentVersionDto,
    taxonomyRow: {
      level: string;
      topic: string;
      subtopic: string | null;
      collocations: string[];
      relatedSkills: string[];
      tracks: string[];
      toeicParts: number[];
    },
  ) {
    return {
      contentId: input.contentId,
      versionId: input.versionId,
      previousVersionId: input.previousVersionId,
      createdByActorId: principal.applicationUserId,
      provenance: input.provenance as ContentProvenance,
      usageScope: input.usageScope as ContentUsageScope,
      accessTier: input.accessTier as ContentAccessTier,
      taxonomy: createSharedTaxonomy({
        ...taxonomyRow,
        subtopic: taxonomyRow.subtopic ?? undefined,
      }),
      source: {
        sourceId: input.sourceId,
        sourceUrl: input.sourceUrl,
        checksum: input.checksum,
        sourceVersion: input.sourceVersion,
      },
      rights: {
        owner: input.rightsOwner,
        licenseStatus: input.licenseStatus as LicenseStatus,
        allowedUsageScopes: input.allowedUsageScopes as ContentUsageScope[],
        allowedAccessTiers: input.allowedAccessTiers as ContentAccessTier[],
        validUntil: input.validUntil,
      },
    };
  }

  private toGoverned(
    row: CmsContentVersion,
    taxonomy: {
      id: string;
      level: string;
      topic: string;
      subtopic: string | null;
      collocations: string[];
      relatedSkills: string[];
      tracks: string[];
      toeicParts: number[];
    },
  ): GovernedContentVersion {
    return createGovernedContentVersion({
      contentId: row.contentId,
      versionId: row.id,
      previousVersionId: row.previousVersionId ?? undefined,
      createdByActorId: row.createdByActorId,
      provenance: row.provenance as ContentProvenance,
      usageScope: row.usageScope as ContentUsageScope,
      accessTier: row.accessTier as ContentAccessTier,
      taxonomy: {
        level: taxonomy.level,
        topic: taxonomy.topic,
        subtopic: taxonomy.subtopic ?? undefined,
        collocations: taxonomy.collocations,
        relatedSkills: taxonomy.relatedSkills,
        tracks: taxonomy.tracks,
        toeicParts: taxonomy.toeicParts,
      },
      source: {
        sourceId: row.sourceId,
        sourceUrl: row.sourceUrl ?? undefined,
        checksum: row.checksum,
        sourceVersion: row.sourceVersion,
      },
      rights: {
        owner: row.rightsOwner,
        licenseStatus: row.licenseStatus as LicenseStatus,
        allowedUsageScopes: row.allowedUsageScopes as ContentUsageScope[],
        allowedAccessTiers: row.allowedAccessTiers as ContentAccessTier[],
        validUntil: row.validUntil?.toISOString(),
      },
    });
  }

  private persistedEvidence(row: CmsContentVersion): ReviewEvidence {
    if (
      !row.reviewerId ||
      !row.reviewDecision ||
      !row.reviewedAt ||
      !row.reviewContentId ||
      !row.reviewVersionId ||
      !row.reviewChecksum ||
      !row.reviewSourceVersion
    ) {
      throw new ContentGovernanceError(
        CONTENT_GOVERNANCE_ERROR_CODES.REVIEW_EVIDENCE_MISMATCH,
      );
    }
    return {
      reviewerId: row.reviewerId,
      decision: row.reviewDecision as 'approved' | 'rejected',
      reviewedAt: row.reviewedAt.toISOString(),
      contentId: row.reviewContentId,
      versionId: row.reviewVersionId,
      checksum: row.reviewChecksum,
      sourceVersion: row.reviewSourceVersion,
    };
  }

  private assertReviewable(row: CmsContentVersion) {
    this.assertPersistedLifecycle(row);
    if (row.reviewStatus !== 'draft') {
      throw new ContentGovernanceError(
        CONTENT_GOVERNANCE_ERROR_CODES.INVALID_TRANSITION,
      );
    }
  }

  private assertPersistedLifecycle(row: CmsContentVersion) {
    if (
      !['draft', 'approved', 'rejected'].includes(row.reviewStatus) ||
      !['draft', 'published'].includes(row.publishStatus)
    ) {
      throw new ContentGovernanceError(
        CONTENT_GOVERNANCE_ERROR_CODES.INVALID_METADATA,
      );
    }
  }

  private authorize(
    principal: ApplicationPrincipal,
    action: ContentAuthorizationAction,
  ) {
    return authorizeHumanContentAction(
      {
        authorizeHumanAction: (requested) =>
          requested === action ? principal.applicationUserId : null,
      },
      action,
    );
  }

  private async requireRole(
    principal: ApplicationPrincipal,
    roles: readonly string[],
    correlationId: string,
    action: string,
  ) {
    if (hasRole(principal, roles)) return;
    await this.auditDenied(
      principal,
      correlationId,
      `cms.${action}`,
      'cms.policy',
      'forbidden_role',
    );
    throw new AccessError(ACCESS_ERROR_CODES.FORBIDDEN_ROLE);
  }

  private auditMutation(
    principal: ApplicationPrincipal,
    correlationId: string,
    action: string,
    target: string,
    outcome: string,
  ) {
    return this.audit.append({
      actorUserId: principal.applicationUserId,
      action,
      target,
      policyResult: 'ALLOW',
      correlationId,
      attributes: { capability: 'cms_governance', outcome },
    });
  }

  private auditDenied(
    principal: ApplicationPrincipal,
    correlationId: string,
    action: string,
    target: string,
    outcome: string,
  ) {
    return this.audit.append({
      actorUserId: principal.applicationUserId,
      action,
      target,
      policyResult: 'DENY',
      correlationId,
      attributes: { capability: 'cms_governance', outcome },
    });
  }

  private taxonomyView(node: CmsTaxonomyNode) {
    return {
      id: node.id,
      parentId: node.parentId,
      level: node.level,
      topic: node.topic,
      subtopic: node.subtopic,
      collocations: node.collocations,
      relatedSkills: node.relatedSkills,
      tracks: node.tracks,
      toeicParts: node.toeicParts,
    };
  }

  private versionView(row: CmsContentVersion) {
    return {
      id: row.id,
      contentId: row.contentId,
      previousVersionId: row.previousVersionId,
      clientRequestId: row.clientRequestId,
      contentType: row.contentType,
      title: row.title,
      body: row.body,
      provenance: row.provenance,
      usageScope: row.usageScope,
      accessTier: row.accessTier,
      taxonomyNodeId: row.taxonomyNodeId,
      source: {
        sourceId: row.sourceId,
        checksum: row.checksum,
        sourceVersion: row.sourceVersion,
      },
      governance: {
        licenseStatus: row.licenseStatus,
        reviewStatus: row.reviewStatus,
        publishStatus: row.publishStatus,
        reviewedAt: row.reviewedAt,
        publishedAt: row.publishedAt,
      },
    };
  }
}
