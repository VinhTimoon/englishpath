-- EP3-ST001 additive foundation. No remote execution is authorized.
-- Owner-approved rollback: remove dependent foreign keys/indexes, then these
-- six tables and library enums in reverse dependency order. Do not automate it.

CREATE TYPE "LibraryContentType" AS ENUM ('LESSON', 'AUDIO', 'VIDEO', 'TRANSCRIPT', 'DOCUMENT');
CREATE TYPE "LibraryStorageState" AS ENUM ('PENDING', 'AVAILABLE', 'QUARANTINED', 'RETIRED');
CREATE TYPE "LibraryReviewStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED');
CREATE TYPE "LibraryPublicationState" AS ENUM ('UNPUBLISHED', 'PUBLISHED', 'RETIRED');
CREATE TYPE "LibraryRightsStatus" AS ENUM ('PENDING', 'APPROVED', 'EXPIRED', 'REJECTED');
CREATE TYPE "LibraryAccessTier" AS ENUM ('FREE', 'PREMIUM', 'INTERNAL');
CREATE TYPE "LibraryUsageScope" AS ENUM ('PRACTICE', 'COURSE', 'REVIEW', 'INTERNAL');

CREATE TABLE "LibraryContent" ("id" TEXT NOT NULL, "contentType" "LibraryContentType" NOT NULL, "title" TEXT NOT NULL, "accessTier" "LibraryAccessTier" NOT NULL DEFAULT 'FREE', "usageScope" "LibraryUsageScope" NOT NULL DEFAULT 'PRACTICE', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "LibraryContent_pkey" PRIMARY KEY ("id"));
CREATE TABLE "LibrarySourceManifest" ("id" TEXT NOT NULL, "provider" TEXT NOT NULL, "sourceFileId" TEXT NOT NULL, "sourceChecksum" TEXT NOT NULL, "sourceVersion" TEXT NOT NULL, "privateSourceRef" TEXT NOT NULL, "parentPathHints" TEXT[] NOT NULL, "manifestJson" JSONB NOT NULL, "inventoriedAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "contentId" TEXT, CONSTRAINT "LibrarySourceManifest_pkey" PRIMARY KEY ("id"));
CREATE TABLE "LibraryContentVersion" ("id" TEXT NOT NULL, "contentId" TEXT NOT NULL, "versionNumber" INTEGER NOT NULL, "previousVersionId" TEXT, "sourceManifestId" TEXT, "sourceChecksum" TEXT NOT NULL, "sourceVersion" TEXT NOT NULL, "reviewStatus" "LibraryReviewStatus" NOT NULL DEFAULT 'DRAFT', "publicationState" "LibraryPublicationState" NOT NULL DEFAULT 'UNPUBLISHED', "rightsStatus" "LibraryRightsStatus" NOT NULL DEFAULT 'PENDING', "rightsExpiresAt" TIMESTAMP(3), "reviewedAt" TIMESTAMP(3), "reviewedBy" TEXT, "publishedAt" TIMESTAMP(3), "retiredAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "LibraryContentVersion_pkey" PRIMARY KEY ("id"));
CREATE TABLE "LibraryStorageReference" ("id" TEXT NOT NULL, "contentVersionId" TEXT NOT NULL, "provider" TEXT NOT NULL, "objectKey" TEXT NOT NULL, "state" "LibraryStorageState" NOT NULL DEFAULT 'PENDING', "metadataJson" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "LibraryStorageReference_pkey" PRIMARY KEY ("id"));
CREATE TABLE "LibraryMediaMetadata" ("contentVersionId" TEXT NOT NULL, "durationSeconds" INTEGER, "mimeType" TEXT NOT NULL, "byteLength" INTEGER, "codec" TEXT, "language" TEXT, CONSTRAINT "LibraryMediaMetadata_pkey" PRIMARY KEY ("contentVersionId"));
CREATE TABLE "LibraryTranscriptMetadata" ("contentVersionId" TEXT NOT NULL, "format" TEXT NOT NULL, "language" TEXT NOT NULL, "segmentCount" INTEGER, CONSTRAINT "LibraryTranscriptMetadata_pkey" PRIMARY KEY ("contentVersionId"));

CREATE UNIQUE INDEX "LibraryContentVersion_contentId_versionNumber_key" ON "LibraryContentVersion"("contentId", "versionNumber");
CREATE UNIQUE INDEX "LibraryContentVersion_contentId_sourceChecksum_sourceVersion_key" ON "LibraryContentVersion"("contentId", "sourceChecksum", "sourceVersion");
CREATE UNIQUE INDEX "LibrarySourceManifest_provider_sourceFileId_sourceChecksum_sourceVersion_key" ON "LibrarySourceManifest"("provider", "sourceFileId", "sourceChecksum", "sourceVersion");
CREATE UNIQUE INDEX "LibraryStorageReference_provider_objectKey_key" ON "LibraryStorageReference"("provider", "objectKey");
CREATE INDEX "LibraryContentVersion_governed_lookup" ON "LibraryContentVersion"("reviewStatus", "publicationState", "rightsStatus", "rightsExpiresAt");
CREATE INDEX "LibraryContentVersion_contentId_publicationState_versionNumber" ON "LibraryContentVersion"("contentId", "publicationState", "versionNumber");
CREATE INDEX "LibrarySourceManifest_contentId_inventoriedAt" ON "LibrarySourceManifest"("contentId", "inventoriedAt");
CREATE INDEX "LibrarySourceManifest_provider_sourceFileId_inventoriedAt" ON "LibrarySourceManifest"("provider", "sourceFileId", "inventoriedAt");
CREATE INDEX "LibraryStorageReference_contentVersionId_state" ON "LibraryStorageReference"("contentVersionId", "state");

ALTER TABLE "LibrarySourceManifest" ADD CONSTRAINT "LibrarySourceManifest_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "LibraryContent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LibraryContentVersion" ADD CONSTRAINT "LibraryContentVersion_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "LibraryContent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LibraryContentVersion" ADD CONSTRAINT "LibraryContentVersion_sourceManifestId_fkey" FOREIGN KEY ("sourceManifestId") REFERENCES "LibrarySourceManifest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LibraryContentVersion" ADD CONSTRAINT "LibraryContentVersion_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "LibraryContentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LibraryStorageReference" ADD CONSTRAINT "LibraryStorageReference_contentVersionId_fkey" FOREIGN KEY ("contentVersionId") REFERENCES "LibraryContentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LibraryMediaMetadata" ADD CONSTRAINT "LibraryMediaMetadata_contentVersionId_fkey" FOREIGN KEY ("contentVersionId") REFERENCES "LibraryContentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LibraryTranscriptMetadata" ADD CONSTRAINT "LibraryTranscriptMetadata_contentVersionId_fkey" FOREIGN KEY ("contentVersionId") REFERENCES "LibraryContentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
