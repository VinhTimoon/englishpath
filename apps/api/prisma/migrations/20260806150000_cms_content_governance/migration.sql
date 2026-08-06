-- EP1-ST029: additive CMS taxonomy and governed content persistence.
-- Rollback requires owner approval and must drop child indexes/foreign keys first.

CREATE TABLE "CmsTaxonomyNode" (
    "id" TEXT NOT NULL,
    "parentId" TEXT,
    "level" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "subtopic" TEXT,
    "collocations" TEXT[] NOT NULL,
    "relatedSkills" TEXT[] NOT NULL,
    "tracks" TEXT[] NOT NULL,
    "toeicParts" INTEGER[] NOT NULL,
    "createdByActorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CmsTaxonomyNode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CmsContent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CmsContent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CmsContentVersion" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "previousVersionId" TEXT,
    "clientRequestId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdByActorId" TEXT NOT NULL,
    "provenance" TEXT NOT NULL,
    "usageScope" TEXT NOT NULL,
    "accessTier" TEXT NOT NULL,
    "taxonomyNodeId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "checksum" TEXT NOT NULL,
    "sourceVersion" TEXT NOT NULL,
    "rightsOwner" TEXT NOT NULL,
    "licenseStatus" TEXT NOT NULL,
    "allowedUsageScopes" TEXT[] NOT NULL,
    "allowedAccessTiers" TEXT[] NOT NULL,
    "validUntil" TIMESTAMP(3),
    "reviewStatus" TEXT NOT NULL DEFAULT 'draft',
    "publishStatus" TEXT NOT NULL DEFAULT 'draft',
    "reviewDecision" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewContentId" TEXT,
    "reviewVersionId" TEXT,
    "reviewChecksum" TEXT,
    "reviewSourceVersion" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CmsContentVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CmsContentVersion_contentId_clientRequestId_key"
  ON "CmsContentVersion"("contentId", "clientRequestId");
CREATE INDEX "CmsTaxonomyNode_parentId_level_topic_idx"
  ON "CmsTaxonomyNode"("parentId", "level", "topic");
CREATE INDEX "CmsContentVersion_taxonomyNodeId_reviewStatus_publishStatus_idx"
  ON "CmsContentVersion"("taxonomyNodeId", "reviewStatus", "publishStatus");
CREATE INDEX "CmsContentVersion_contentId_createdAt_idx"
  ON "CmsContentVersion"("contentId", "createdAt");

ALTER TABLE "CmsTaxonomyNode"
  ADD CONSTRAINT "CmsTaxonomyNode_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "CmsTaxonomyNode"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CmsContentVersion"
  ADD CONSTRAINT "CmsContentVersion_contentId_fkey"
  FOREIGN KEY ("contentId") REFERENCES "CmsContent"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CmsContentVersion"
  ADD CONSTRAINT "CmsContentVersion_previousVersionId_fkey"
  FOREIGN KEY ("previousVersionId") REFERENCES "CmsContentVersion"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CmsContentVersion"
  ADD CONSTRAINT "CmsContentVersion_taxonomyNodeId_fkey"
  FOREIGN KEY ("taxonomyNodeId") REFERENCES "CmsTaxonomyNode"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
