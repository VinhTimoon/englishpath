CREATE TABLE "LibraryDrillOutcome" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "contentVersionId" TEXT NOT NULL,
  "drillId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "selectedOptionId" TEXT NOT NULL,
  "isCorrect" BOOLEAN NOT NULL,
  "score" INTEGER NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LibraryDrillOutcome_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LibraryDrillOutcome_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LibraryDrillOutcome_contentVersionId_fkey" FOREIGN KEY ("contentVersionId") REFERENCES "LibraryContentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LibraryDrillOutcome_userId_contentVersionId_drillId_questionId_key" ON "LibraryDrillOutcome"("userId", "contentVersionId", "drillId", "questionId");
CREATE INDEX "LibraryDrillOutcome_userId_contentVersionId_completedAt_idx" ON "LibraryDrillOutcome"("userId", "contentVersionId", "completedAt");
