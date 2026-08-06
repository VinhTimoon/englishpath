import { Inject, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import type { Prisma } from '../../generated/prisma/client';
import {
  ToeicAccessTier,
  ToeicLicenseStatus,
  ToeicPublicationState,
  ToeicReviewDecision,
  ToeicReviewStatus,
  ToeicUsageScope,
} from '../../generated/prisma/enums';
import type { ApplicationPrincipal } from '../access';
import { AuditService } from '../audit/audit.service';
import { TOEIC_ERROR_CODES, ToeicQuestionError } from './toeic-question.error';
import type {
  ToeicImportDto,
  ToeicPublishDto,
  ToeicReviewDto,
} from './dto/toeic-admin.dto';
import {
  TOEIC_ADMIN_REPOSITORY,
  type ToeicAdminRecord,
  type ToeicAdminRepository,
} from './toeic-admin.models';

const EDITOR_ROLES = ['CONTENT_EDITOR', 'ADMIN', 'SUPER_ADMIN'] as const;
const PUBLISH_ROLES = ['ADMIN', 'SUPER_ADMIN'] as const;
const VERSION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

type ResolvedGovernance = Readonly<{
  sourceIdentity: string;
  sourceUrl: string;
  provenance: string;
  rightsOwner: string;
  licenseStatus: ToeicLicenseStatus;
  allowedUsageScopes: readonly ToeicUsageScope[];
  accessTier: ToeicAccessTier;
}>;

// Import metadata is a claim that must match a server-owned source policy.
// The policy is intentionally allowlisted until a governed source registry is
// approved; client fields never create or broaden publication rights.
const TOEIC_SOURCE_POLICIES: Readonly<Record<string, ResolvedGovernance>> = {
  'englishpath-original': Object.freeze({
    sourceIdentity: 'englishpath-original',
    sourceUrl: 'https://englishpath.example/content/toeic',
    provenance: 'CC0-1.0',
    rightsOwner: 'EnglishPath',
    licenseStatus: ToeicLicenseStatus.APPROVED,
    allowedUsageScopes: Object.freeze([ToeicUsageScope.PRACTICE]),
    accessTier: ToeicAccessTier.FREE,
  }),
};

type SafeAdminView = Readonly<{
  id: string;
  questionId: string;
  version: number;
  part: ToeicAdminRecord['part'];
  questionType: ToeicAdminRecord['questionType'];
  difficulty: ToeicAdminRecord['difficulty'];
  topic: string | null;
  stimulusGroup: string | null;
  reviewStatus: ToeicAdminRecord['reviewStatus'];
  publicationState: ToeicAdminRecord['publicationState'];
  licenseStatus: ToeicAdminRecord['licenseStatus'];
  accessTier: ToeicAdminRecord['accessTier'];
}>;

function hasRole(
  principal: ApplicationPrincipal,
  roles: readonly string[],
): boolean {
  return roles.some((role) => principal.roles.includes(role));
}

function safeView(row: ToeicAdminRecord): SafeAdminView {
  return {
    id: row.id,
    questionId: row.questionId,
    version: row.version,
    part: row.part,
    questionType: row.questionType,
    difficulty: row.difficulty,
    topic: row.topic,
    stimulusGroup: row.stimulusGroup,
    reviewStatus: row.reviewStatus,
    publicationState: row.publicationState,
    licenseStatus: row.licenseStatus,
    accessTier: row.accessTier,
  };
}

function assertOptions(dto: ToeicImportDto): void {
  const ids = dto.options.map((option) => option.id);
  if (new Set(ids).size !== ids.length || !ids.includes(dto.correctAnswer)) {
    throw new ToeicQuestionError(TOEIC_ERROR_CODES.INVALID_CONTENT);
  }
}

function assertImportDate(validUntil: string | undefined): Date | null {
  if (!validUntil) return null;
  const date = new Date(validUntil);
  if (!Number.isFinite(date.getTime()) || date <= new Date()) {
    throw new ToeicQuestionError(TOEIC_ERROR_CODES.NOT_PUBLISHABLE);
  }
  return date;
}

function resolveGovernance(dto: ToeicImportDto): ResolvedGovernance {
  const policy = TOEIC_SOURCE_POLICIES[dto.sourceIdentity];
  if (
    !policy ||
    dto.sourceUrl !== policy.sourceUrl ||
    dto.provenance !== policy.provenance ||
    dto.rightsOwner !== policy.rightsOwner ||
    dto.licenseStatus !== policy.licenseStatus ||
    JSON.stringify(dto.allowedUsageScopes) !==
      JSON.stringify(policy.allowedUsageScopes) ||
    dto.accessTier !== policy.accessTier
  ) {
    throw new ToeicQuestionError(TOEIC_ERROR_CODES.INVALID_CONTENT);
  }
  return policy;
}

function expectedChecksum(
  dto: ToeicImportDto,
  governance: ResolvedGovernance,
): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        questionId: dto.questionId,
        version: dto.version,
        previousVersionId: dto.previousVersionId ?? null,
        part: dto.part,
        questionType: dto.questionType,
        difficulty: dto.difficulty,
        topic: dto.topic ?? null,
        stimulusGroup: dto.stimulusGroup ?? null,
        prompt: dto.prompt,
        options: dto.options,
        mediaReference: dto.mediaReference ?? null,
        explanation: dto.explanation ?? null,
        correctAnswer: dto.correctAnswer,
        sourceIdentity: governance.sourceIdentity,
        sourceUrl: governance.sourceUrl,
        sourceVersion: dto.sourceVersion,
        provenance: governance.provenance,
        rightsOwner: governance.rightsOwner,
        licenseStatus: governance.licenseStatus,
        allowedUsageScopes: governance.allowedUsageScopes,
        accessTier: governance.accessTier,
        validUntil: dto.validUntil ?? null,
      }),
    )
    .digest('hex');
}

function sameImport(
  row: ToeicAdminRecord,
  dto: ToeicImportDto,
  governance: ResolvedGovernance,
): boolean {
  return (
    row.questionId === dto.questionId &&
    row.version === dto.version &&
    row.previousVersionId === (dto.previousVersionId ?? null) &&
    row.part === dto.part &&
    row.questionType === dto.questionType &&
    row.difficulty === dto.difficulty &&
    row.topic === (dto.topic ?? null) &&
    row.stimulusGroup === (dto.stimulusGroup ?? null) &&
    row.prompt === dto.prompt &&
    JSON.stringify(row.options) === JSON.stringify(dto.options) &&
    row.mediaReference === (dto.mediaReference ?? null) &&
    row.explanation === (dto.explanation ?? null) &&
    row.correctAnswer === dto.correctAnswer &&
    row.sourceIdentity === governance.sourceIdentity &&
    row.sourceUrl === governance.sourceUrl &&
    row.checksum === dto.checksum &&
    row.sourceVersion === dto.sourceVersion &&
    row.provenance === governance.provenance &&
    row.rightsOwner === governance.rightsOwner &&
    row.licenseStatus === governance.licenseStatus &&
    JSON.stringify(row.allowedUsageScopes) ===
      JSON.stringify(governance.allowedUsageScopes) &&
    row.accessTier === governance.accessTier &&
    (row.validUntil?.getTime() ?? null) ===
      (dto.validUntil ? new Date(dto.validUntil).getTime() : null)
  );
}

function isCompleteForReview(row: ToeicAdminRecord): boolean {
  if (
    !row.prompt.trim() ||
    !row.sourceIdentity ||
    !row.sourceUrl ||
    !row.checksum
  )
    return false;
  if (!row.sourceVersion || !row.provenance || !row.rightsOwner) return false;
  if (row.licenseStatus !== ToeicLicenseStatus.APPROVED) return false;
  if (row.accessTier !== ToeicAccessTier.FREE) return false;
  if (!row.allowedUsageScopes.includes(ToeicUsageScope.PRACTICE)) return false;
  if (row.validUntil !== null && row.validUntil <= new Date()) return false;
  if (!Array.isArray(row.options) || row.options.length < 2) return false;
  const options = row.options as Array<{ id?: unknown; text?: unknown }>;
  const ids = options.map((option) => option.id);
  return (
    options.every(
      (option) =>
        typeof option.id === 'string' &&
        /^[A-F]$/.test(option.id) &&
        typeof option.text === 'string' &&
        option.text.trim().length > 0,
    ) &&
    new Set(ids).size === ids.length &&
    typeof row.correctAnswer === 'string' &&
    ids.includes(row.correctAnswer)
  );
}

function hasResolvedGovernance(row: ToeicAdminRecord): boolean {
  const policy = TOEIC_SOURCE_POLICIES[row.sourceIdentity];
  return Boolean(
    policy &&
    row.provenance === policy.provenance &&
    row.sourceUrl === policy.sourceUrl &&
    row.rightsOwner === policy.rightsOwner &&
    row.licenseStatus === policy.licenseStatus &&
    JSON.stringify(row.allowedUsageScopes) ===
      JSON.stringify(policy.allowedUsageScopes) &&
    row.accessTier === policy.accessTier,
  );
}

function safeVersionTarget(id: string): string {
  return VERSION_ID_PATTERN.test(id) ? id : 'invalid-version-id';
}

function reviewEvidence(row: ToeicAdminRecord): string | null {
  if (!row.reviewEvidence || !row.reviewerIdentity || !row.reviewedAt) {
    return null;
  }
  try {
    const evidence: unknown = JSON.parse(row.reviewEvidence);
    if (!evidence || typeof evidence !== 'object') return null;
    const candidate = evidence as Record<string, unknown>;
    return candidate.questionId === row.questionId &&
      candidate.versionId === row.id &&
      candidate.version === row.version &&
      candidate.checksum === row.checksum &&
      candidate.sourceVersion === row.sourceVersion &&
      candidate.reviewerId === row.reviewerIdentity &&
      candidate.reviewedAt === row.reviewedAt.toISOString()
      ? row.reviewEvidence
      : null;
  } catch {
    return null;
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

@Injectable()
export class ToeicAdminService {
  constructor(
    @Inject(TOEIC_ADMIN_REPOSITORY)
    private readonly repository: ToeicAdminRepository,
    private readonly audit: AuditService,
  ) {}

  private async record(
    principal: ApplicationPrincipal,
    action: string,
    target: string,
    policyResult: 'ALLOW' | 'DENY',
    correlationId: string,
  ): Promise<void> {
    await this.audit.append({
      actorUserId: principal.applicationUserId,
      action,
      target,
      policyResult,
      correlationId,
      attributes: { outcome: policyResult === 'ALLOW' ? 'allowed' : 'denied' },
    });
  }

  private async authorize(
    principal: ApplicationPrincipal,
    roles: readonly string[],
    action: string,
    target: string,
    correlationId: string,
  ): Promise<void> {
    const allowed = hasRole(principal, roles);
    if (!allowed) {
      await this.record(principal, action, target, 'DENY', correlationId);
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.FORBIDDEN);
    }
  }

  private async reject(
    principal: ApplicationPrincipal,
    action: string,
    target: string,
    correlationId: string,
    error: ToeicQuestionError,
  ): Promise<never> {
    await this.record(principal, action, target, 'DENY', correlationId);
    throw error;
  }

  async import(
    dto: ToeicImportDto,
    principal: ApplicationPrincipal,
    correlationId: string,
    idempotencyKey?: string,
  ) {
    await this.authorize(
      principal,
      EDITOR_ROLES,
      'toeic.question.import',
      dto.questionId,
      correlationId,
    );
    const key = idempotencyKey?.trim();
    if (!key || !/^[A-Za-z0-9][A-Za-z0-9._:-]{7,191}$/.test(key)) {
      return this.reject(
        principal,
        'toeic.question.import',
        dto.questionId,
        correlationId,
        new ToeicQuestionError(TOEIC_ERROR_CODES.MISSING_IDEMPOTENCY_KEY),
      );
    }
    let validUntil: Date | null;
    let governance: ResolvedGovernance;
    try {
      assertOptions(dto);
      validUntil = assertImportDate(dto.validUntil);
      governance = resolveGovernance(dto);
    } catch (error) {
      return this.reject(
        principal,
        'toeic.question.import',
        dto.questionId,
        correlationId,
        error instanceof ToeicQuestionError
          ? error
          : new ToeicQuestionError(TOEIC_ERROR_CODES.INVALID_CONTENT),
      );
    }
    if (dto.checksum !== expectedChecksum(dto, governance)) {
      return this.reject(
        principal,
        'toeic.question.import',
        dto.questionId,
        correlationId,
        new ToeicQuestionError(TOEIC_ERROR_CODES.INVALID_CONTENT),
      );
    }
    const importIdentity = `${principal.applicationUserId}:toeic.question-versions.import:${key}`;
    if (importIdentity.length > 191) {
      return this.reject(
        principal,
        'toeic.question.import',
        dto.questionId,
        correlationId,
        new ToeicQuestionError(TOEIC_ERROR_CODES.INVALID_CONTENT),
      );
    }
    let existing: ToeicAdminRecord | null;
    try {
      existing = await this.repository.findByImportIdentity(importIdentity);
    } catch {
      return this.reject(
        principal,
        'toeic.question.import',
        dto.questionId,
        correlationId,
        new ToeicQuestionError(TOEIC_ERROR_CODES.REPOSITORY_FAILURE),
      );
    }
    if (existing) {
      if (!sameImport(existing, dto, governance)) {
        return this.reject(
          principal,
          'toeic.question.import',
          dto.questionId,
          correlationId,
          new ToeicQuestionError(TOEIC_ERROR_CODES.CONFLICT),
        );
      }
      await this.record(
        principal,
        'toeic.question.import',
        dto.questionId,
        'ALLOW',
        correlationId,
      );
      return {
        data: safeView(existing),
        idempotencyStatus: 'replayed' as const,
      };
    }

    let sameVersion: ToeicAdminRecord | null;
    let sameSource: ToeicAdminRecord | null;
    try {
      sameVersion = await this.repository.findByQuestionVersion(
        dto.questionId,
        dto.version,
      );
      sameSource = await this.repository.findBySourceVersion(
        dto.sourceIdentity,
        dto.checksum,
        dto.sourceVersion,
      );
    } catch {
      return this.reject(
        principal,
        'toeic.question.import',
        dto.questionId,
        correlationId,
        new ToeicQuestionError(TOEIC_ERROR_CODES.REPOSITORY_FAILURE),
      );
    }
    if (sameVersion) {
      return this.reject(
        principal,
        'toeic.question.import',
        dto.questionId,
        correlationId,
        new ToeicQuestionError(TOEIC_ERROR_CODES.CONFLICT),
      );
    }
    if (sameSource) {
      return this.reject(
        principal,
        'toeic.question.import',
        dto.questionId,
        correlationId,
        new ToeicQuestionError(TOEIC_ERROR_CODES.CONFLICT),
      );
    }

    if (dto.version === 1) {
      if (dto.previousVersionId) {
        return this.reject(
          principal,
          'toeic.question.import',
          dto.questionId,
          correlationId,
          new ToeicQuestionError(TOEIC_ERROR_CODES.INVALID_LINEAGE),
        );
      }
    } else {
      if (!dto.previousVersionId) {
        return this.reject(
          principal,
          'toeic.question.import',
          dto.questionId,
          correlationId,
          new ToeicQuestionError(TOEIC_ERROR_CODES.INVALID_LINEAGE),
        );
      }
      let previous: ToeicAdminRecord | null;
      try {
        previous = await this.repository.findByVersionId(dto.previousVersionId);
      } catch {
        return this.reject(
          principal,
          'toeic.question.import',
          dto.questionId,
          correlationId,
          new ToeicQuestionError(TOEIC_ERROR_CODES.REPOSITORY_FAILURE),
        );
      }
      if (
        !previous ||
        previous.questionId !== dto.questionId ||
        previous.version !== dto.version - 1
      ) {
        return this.reject(
          principal,
          'toeic.question.import',
          dto.questionId,
          correlationId,
          new ToeicQuestionError(TOEIC_ERROR_CODES.INVALID_LINEAGE),
        );
      }
    }

    let row: ToeicAdminRecord;
    try {
      await this.record(
        principal,
        'toeic.question.import',
        dto.questionId,
        'ALLOW',
        correlationId,
      );
      row = await this.repository.create({
        id: randomUUID(),
        questionId: dto.questionId,
        version: dto.version,
        previousVersionId: dto.previousVersionId ?? null,
        importIdentity,
        part: dto.part,
        questionType: dto.questionType,
        difficulty: dto.difficulty,
        topic: dto.topic ?? null,
        stimulusGroup: dto.stimulusGroup ?? null,
        prompt: dto.prompt,
        options: dto.options as unknown as Prisma.InputJsonValue,
        mediaReference: dto.mediaReference ?? null,
        explanation: dto.explanation ?? null,
        correctAnswer: dto.correctAnswer,
        sourceIdentity: governance.sourceIdentity,
        sourceUrl: governance.sourceUrl,
        checksum: dto.checksum,
        sourceVersion: dto.sourceVersion,
        provenance: governance.provenance,
        rightsOwner: governance.rightsOwner,
        licenseStatus: governance.licenseStatus,
        allowedUsageScopes: [...governance.allowedUsageScopes],
        accessTier: governance.accessTier,
        reviewStatus: ToeicReviewStatus.DRAFT,
        publicationState: ToeicPublicationState.UNPUBLISHED,
        validUntil,
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        try {
          const raced =
            await this.repository.findByImportIdentity(importIdentity);
          if (raced && sameImport(raced, dto, governance)) {
            await this.record(
              principal,
              'toeic.question.import',
              dto.questionId,
              'ALLOW',
              correlationId,
            );
            return {
              data: safeView(raced),
              idempotencyStatus: 'replayed' as const,
            };
          }
        } catch {
          return this.reject(
            principal,
            'toeic.question.import',
            dto.questionId,
            correlationId,
            new ToeicQuestionError(TOEIC_ERROR_CODES.REPOSITORY_FAILURE),
          );
        }
        return this.reject(
          principal,
          'toeic.question.import',
          dto.questionId,
          correlationId,
          new ToeicQuestionError(TOEIC_ERROR_CODES.CONFLICT),
        );
      }
      return this.reject(
        principal,
        'toeic.question.import',
        dto.questionId,
        correlationId,
        new ToeicQuestionError(TOEIC_ERROR_CODES.REPOSITORY_FAILURE),
      );
    }
    return { data: safeView(row), idempotencyStatus: 'created' as const };
  }

  async review(
    id: string,
    dto: ToeicReviewDto,
    principal: ApplicationPrincipal,
    correlationId: string,
  ) {
    const target = safeVersionTarget(id);
    await this.authorize(
      principal,
      EDITOR_ROLES,
      'toeic.question.review',
      target,
      correlationId,
    );
    if (target !== id) {
      return this.reject(
        principal,
        'toeic.question.review',
        target,
        correlationId,
        new ToeicQuestionError(TOEIC_ERROR_CODES.INVALID_CONTENT),
      );
    }
    let row: ToeicAdminRecord | null;
    try {
      row = await this.repository.findByVersionId(id);
    } catch {
      return this.reject(
        principal,
        'toeic.question.review',
        target,
        correlationId,
        new ToeicQuestionError(TOEIC_ERROR_CODES.REPOSITORY_FAILURE),
      );
    }
    if (!row) {
      return this.reject(
        principal,
        'toeic.question.review',
        target,
        correlationId,
        new ToeicQuestionError(TOEIC_ERROR_CODES.NOT_FOUND),
      );
    }
    if (
      row.publicationState !== ToeicPublicationState.UNPUBLISHED ||
      row.reviewStatus !== ToeicReviewStatus.DRAFT ||
      row.checksum !== dto.checksum ||
      row.sourceVersion !== dto.sourceVersion ||
      row.importIdentity.startsWith(`${principal.applicationUserId}:`)
    ) {
      return this.reject(
        principal,
        'toeic.question.review',
        target,
        correlationId,
        new ToeicQuestionError(TOEIC_ERROR_CODES.STALE_REVIEW),
      );
    }
    if (
      dto.decision === ToeicReviewDecision.APPROVE &&
      (!isCompleteForReview(row) || !hasResolvedGovernance(row))
    ) {
      return this.reject(
        principal,
        'toeic.question.review',
        target,
        correlationId,
        new ToeicQuestionError(TOEIC_ERROR_CODES.INVALID_CONTENT),
      );
    }
    const reviewedAt = new Date();
    let updated: ToeicAdminRecord | null;
    try {
      await this.record(
        principal,
        'toeic.question.review',
        target,
        'ALLOW',
        correlationId,
      );
      updated = await this.repository.review(
        target,
        { checksum: dto.checksum, sourceVersion: dto.sourceVersion },
        {
          reviewStatus:
            dto.decision === ToeicReviewDecision.APPROVE
              ? ToeicReviewStatus.REVIEWED
              : ToeicReviewStatus.REJECTED,
          reviewDecision: dto.decision,
          reviewerIdentity: principal.applicationUserId,
          reviewedAt,
          reviewEvidence: JSON.stringify({
            questionId: row.questionId,
            versionId: row.id,
            version: row.version,
            checksum: row.checksum,
            sourceVersion: row.sourceVersion,
            reviewerId: principal.applicationUserId,
            reviewedAt: reviewedAt.toISOString(),
          }),
        },
      );
    } catch {
      return this.reject(
        principal,
        'toeic.question.review',
        target,
        correlationId,
        new ToeicQuestionError(TOEIC_ERROR_CODES.REPOSITORY_FAILURE),
      );
    }
    if (!updated) {
      return this.reject(
        principal,
        'toeic.question.review',
        target,
        correlationId,
        new ToeicQuestionError(TOEIC_ERROR_CODES.STALE_REVIEW),
      );
    }
    return {
      data: safeView(updated),
      idempotencyStatus: 'not_applicable' as const,
    };
  }

  async publish(
    id: string,
    dto: ToeicPublishDto,
    principal: ApplicationPrincipal,
    correlationId: string,
  ) {
    const target = safeVersionTarget(id);
    await this.authorize(
      principal,
      PUBLISH_ROLES,
      'toeic.question.publish',
      target,
      correlationId,
    );
    if (target !== id) {
      return this.reject(
        principal,
        'toeic.question.publish',
        target,
        correlationId,
        new ToeicQuestionError(TOEIC_ERROR_CODES.INVALID_CONTENT),
      );
    }
    let row: ToeicAdminRecord | null;
    try {
      row = await this.repository.findByVersionId(id);
    } catch {
      return this.reject(
        principal,
        'toeic.question.publish',
        target,
        correlationId,
        new ToeicQuestionError(TOEIC_ERROR_CODES.REPOSITORY_FAILURE),
      );
    }
    if (!row) {
      return this.reject(
        principal,
        'toeic.question.publish',
        target,
        correlationId,
        new ToeicQuestionError(TOEIC_ERROR_CODES.NOT_FOUND),
      );
    }
    const now = new Date();
    if (
      row.reviewStatus !== ToeicReviewStatus.REVIEWED ||
      row.reviewDecision !== ToeicReviewDecision.APPROVE ||
      row.publicationState !== ToeicPublicationState.UNPUBLISHED ||
      row.licenseStatus !== ToeicLicenseStatus.APPROVED ||
      row.accessTier !== ToeicAccessTier.FREE ||
      !row.allowedUsageScopes.includes(ToeicUsageScope.PRACTICE) ||
      !row.sourceIdentity ||
      !row.sourceUrl ||
      !row.checksum ||
      !row.sourceVersion ||
      !row.provenance ||
      !row.rightsOwner ||
      row.checksum !== dto.checksum ||
      row.sourceVersion !== dto.sourceVersion ||
      (row.validUntil !== null && row.validUntil <= now) ||
      !hasResolvedGovernance(row) ||
      !reviewEvidence(row)
    ) {
      return this.reject(
        principal,
        'toeic.question.publish',
        target,
        correlationId,
        new ToeicQuestionError(TOEIC_ERROR_CODES.NOT_PUBLISHABLE),
      );
    }
    let published: ToeicAdminRecord | null;
    try {
      await this.record(
        principal,
        'toeic.question.publish',
        target,
        'ALLOW',
        correlationId,
      );
      published = await this.repository.publish(
        target,
        { checksum: dto.checksum, sourceVersion: dto.sourceVersion },
        {
          publicationState: ToeicPublicationState.PUBLISHED,
          publishedAt: now,
        },
      );
    } catch {
      return this.reject(
        principal,
        'toeic.question.publish',
        target,
        correlationId,
        new ToeicQuestionError(TOEIC_ERROR_CODES.REPOSITORY_FAILURE),
      );
    }
    if (!published) {
      return this.reject(
        principal,
        'toeic.question.publish',
        target,
        correlationId,
        new ToeicQuestionError(TOEIC_ERROR_CODES.CONFLICT),
      );
    }
    return {
      data: safeView(published),
      idempotencyStatus: 'not_applicable' as const,
    };
  }
}
