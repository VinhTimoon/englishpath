import type { Prisma } from '../../generated/prisma/client';
import type {
  ToeicAccessTier,
  ToeicDifficulty,
  ToeicLicenseStatus,
  ToeicPart,
  ToeicQuestionType,
  ToeicReviewDecision,
  ToeicReviewStatus,
  ToeicUsageScope,
  ToeicPublicationState,
} from '../../generated/prisma/enums';

export const TOEIC_ADMIN_REPOSITORY = Symbol('TOEIC_ADMIN_REPOSITORY');

export const TOEIC_ADMIN_SELECT = {
  id: true,
  questionId: true,
  version: true,
  previousVersionId: true,
  importIdentity: true,
  part: true,
  questionType: true,
  difficulty: true,
  topic: true,
  stimulusGroup: true,
  prompt: true,
  options: true,
  mediaReference: true,
  explanation: true,
  correctAnswer: true,
  sourceIdentity: true,
  sourceUrl: true,
  checksum: true,
  sourceVersion: true,
  provenance: true,
  rightsOwner: true,
  licenseStatus: true,
  allowedUsageScopes: true,
  accessTier: true,
  reviewStatus: true,
  reviewDecision: true,
  reviewEvidence: true,
  reviewerIdentity: true,
  reviewedAt: true,
  publicationState: true,
  publishedAt: true,
  validUntil: true,
} as const satisfies Prisma.ToeicQuestionVersionSelect;

export type ToeicAdminRecord = Prisma.ToeicQuestionVersionGetPayload<{
  select: typeof TOEIC_ADMIN_SELECT;
}>;

export type ToeicAdminCreateInput = Readonly<{
  id: string;
  questionId: string;
  version: number;
  previousVersionId: string | null;
  importIdentity: string;
  part: ToeicPart;
  questionType: ToeicQuestionType;
  difficulty: ToeicDifficulty;
  topic: string | null;
  stimulusGroup: string | null;
  prompt: string;
  options: Prisma.InputJsonValue;
  mediaReference: string | null;
  explanation: string | null;
  correctAnswer: string;
  sourceIdentity: string;
  sourceUrl: string | null;
  checksum: string;
  sourceVersion: string;
  provenance: string;
  rightsOwner: string;
  licenseStatus: ToeicLicenseStatus;
  allowedUsageScopes: ToeicUsageScope[];
  accessTier: ToeicAccessTier;
  reviewStatus: ToeicReviewStatus;
  publicationState: ToeicPublicationState;
  validUntil: Date | null;
}>;

export type ToeicReviewUpdate = Readonly<{
  reviewStatus: ToeicReviewStatus;
  reviewDecision: ToeicReviewDecision;
  reviewEvidence: string;
  reviewerIdentity: string;
  reviewedAt: Date;
}>;

export type ToeicPublishUpdate = Readonly<{
  publicationState: ToeicPublicationState;
  publishedAt: Date;
}>;

export interface ToeicAdminRepository {
  findByImportIdentity(
    importIdentity: string,
  ): Promise<ToeicAdminRecord | null>;
  findByVersionId(id: string): Promise<ToeicAdminRecord | null>;
  findByQuestionVersion(
    questionId: string,
    version: number,
  ): Promise<ToeicAdminRecord | null>;
  findBySourceVersion(
    sourceIdentity: string,
    checksum: string,
    sourceVersion: string,
  ): Promise<ToeicAdminRecord | null>;
  create(input: ToeicAdminCreateInput): Promise<ToeicAdminRecord>;
  review(
    id: string,
    expected: Readonly<{ checksum: string; sourceVersion: string }>,
    update: ToeicReviewUpdate,
  ): Promise<ToeicAdminRecord | null>;
  publish(
    id: string,
    expected: Readonly<{ checksum: string; sourceVersion: string }>,
    update: ToeicPublishUpdate,
  ): Promise<ToeicAdminRecord | null>;
}
