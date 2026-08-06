-- EP2-ST001: additive TOEIC question governance boundary.
-- This migration is local/generated evidence only; automation must not apply it to Supabase.
-- Owner-approved rollback order: remove version foreign keys/indexes/table, then question
-- foreign keys/indexes/table, then the new enums. Preserve all existing learner/CMS data.

CREATE TYPE "ToeicPart" AS ENUM ('PART_1','PART_2','PART_3','PART_4','PART_5','PART_6','PART_7');
CREATE TYPE "ToeicQuestionType" AS ENUM ('PHOTO_DESCRIPTION','QUESTION_RESPONSE','CONVERSATION','TALK','INCOMPLETE_SENTENCE','TEXT_COMPLETION','READING_COMPREHENSION');
CREATE TYPE "ToeicDifficulty" AS ENUM ('BEGINNER','ELEMENTARY','INTERMEDIATE','UPPER_INTERMEDIATE','ADVANCED');
CREATE TYPE "ToeicLicenseStatus" AS ENUM ('UNKNOWN','PENDING_REVIEW','APPROVED','REJECTED','EXPIRED');
CREATE TYPE "ToeicReviewStatus" AS ENUM ('DRAFT','IN_REVIEW','REVIEWED','REJECTED');
CREATE TYPE "ToeicReviewDecision" AS ENUM ('APPROVE','REJECT','REQUEST_CHANGES');
CREATE TYPE "ToeicPublicationState" AS ENUM ('UNPUBLISHED','PUBLISHED','RETIRED');
CREATE TYPE "ToeicUsageScope" AS ENUM ('PRACTICE','MOCK_TEST','EXAM','REVIEW');
CREATE TYPE "ToeicAccessTier" AS ENUM ('FREE','PREMIUM','INTERNAL');

CREATE TABLE "ToeicQuestion" (
  "id" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "ToeicQuestion_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ToeicQuestionVersion" (
  "id" TEXT NOT NULL, "questionId" TEXT NOT NULL, "version" INTEGER NOT NULL,
  "previousVersionId" TEXT, "importIdentity" TEXT NOT NULL, "part" "ToeicPart" NOT NULL,
  "questionType" "ToeicQuestionType" NOT NULL, "difficulty" "ToeicDifficulty" NOT NULL,
  "topic" TEXT, "stimulusGroup" TEXT, "prompt" TEXT NOT NULL, "options" JSONB NOT NULL,
  "mediaReference" TEXT, "explanation" TEXT, "correctAnswer" TEXT NOT NULL,
  "sourceIdentity" TEXT NOT NULL, "sourceUrl" TEXT, "checksum" TEXT NOT NULL,
  "sourceVersion" TEXT NOT NULL, "provenance" TEXT NOT NULL, "rightsOwner" TEXT NOT NULL,
  "licenseStatus" "ToeicLicenseStatus" NOT NULL, "allowedUsageScopes" "ToeicUsageScope"[],
  "accessTier" "ToeicAccessTier" NOT NULL, "reviewStatus" "ToeicReviewStatus" NOT NULL DEFAULT 'DRAFT',
  "reviewDecision" "ToeicReviewDecision", "reviewEvidence" TEXT, "reviewerIdentity" TEXT,
  "reviewedAt" TIMESTAMP(3), "publicationState" "ToeicPublicationState" NOT NULL DEFAULT 'UNPUBLISHED',
  "publishedAt" TIMESTAMP(3), "validUntil" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ToeicQuestionVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ToeicQuestionVersion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ToeicQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ToeicQuestionVersion_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "ToeicQuestionVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ToeicQuestionVersion_questionId_version_key" ON "ToeicQuestionVersion"("questionId","version");
CREATE UNIQUE INDEX "ToeicQuestionVersion_sourceIdentity_checksum_sourceVersion_key" ON "ToeicQuestionVersion"("sourceIdentity","checksum","sourceVersion");
CREATE UNIQUE INDEX "ToeicQuestionVersion_importIdentity_key" ON "ToeicQuestionVersion"("importIdentity");
CREATE INDEX "ToeicQuestionVersion_questionId_version_idx" ON "ToeicQuestionVersion"("questionId","version");
CREATE INDEX "ToeicQuestionVersion_part_questionType_difficulty_idx" ON "ToeicQuestionVersion"("part","questionType","difficulty");
CREATE INDEX "ToeicQuestionVersion_reviewStatus_publicationState_publishedAt_validUntil_idx" ON "ToeicQuestionVersion"("reviewStatus","publicationState","publishedAt","validUntil");
CREATE INDEX "ToeicQuestionVersion_stimulusGroup_idx" ON "ToeicQuestionVersion"("stimulusGroup");
