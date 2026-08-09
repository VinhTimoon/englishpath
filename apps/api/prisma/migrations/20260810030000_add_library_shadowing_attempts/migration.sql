CREATE TYPE "LibraryShadowingAttemptStatus" AS ENUM ('ACTIVE', 'PAUSED', 'FINALIZED');

CREATE TABLE "LibraryShadowingAttempt" (
  "id" TEXT NOT NULL,
  "attemptKey" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "contentVersionId" TEXT NOT NULL,
  "segmentIndex" INTEGER NOT NULL DEFAULT 0,
  "positionSeconds" INTEGER NOT NULL DEFAULT 0,
  "status" "LibraryShadowingAttemptStatus" NOT NULL DEFAULT 'ACTIVE',
  "selfRating" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "finalizedAt" TIMESTAMP(3),
  CONSTRAINT "LibraryShadowingAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LibraryShadowingAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LibraryShadowingAttempt_contentVersionId_fkey" FOREIGN KEY ("contentVersionId") REFERENCES "LibraryContentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LibraryShadowingAttempt_attemptKey_key" ON "LibraryShadowingAttempt"("attemptKey");
CREATE INDEX "LibraryShadowingAttempt_userId_contentVersionId_updatedAt_idx" ON "LibraryShadowingAttempt"("userId", "contentVersionId", "updatedAt");
CREATE INDEX "LibraryShadowingAttempt_userId_finalizedAt_idx" ON "LibraryShadowingAttempt"("userId", "finalizedAt");
