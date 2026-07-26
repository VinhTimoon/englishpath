-- Additive learner-owned SRS state and idempotent review submissions.
CREATE TABLE "VocabularyMasteryState" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "vocabularyId" TEXT NOT NULL,
  "mastery" INTEGER NOT NULL DEFAULT 0, "repetitions" INTEGER NOT NULL DEFAULT 0,
  "intervalDays" INTEGER NOT NULL DEFAULT 0, "nextReviewAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastReviewedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VocabularyMasteryState_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "VocabularyReviewSubmission" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "vocabularyId" TEXT NOT NULL,
  "clientSubmissionId" TEXT NOT NULL, "quality" INTEGER NOT NULL, "result" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VocabularyReviewSubmission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VocabularyMasteryState_userId_vocabularyId_key" ON "VocabularyMasteryState"("userId", "vocabularyId");
CREATE INDEX "VocabularyMasteryState_userId_nextReviewAt_vocabularyId_idx" ON "VocabularyMasteryState"("userId", "nextReviewAt", "vocabularyId");
CREATE UNIQUE INDEX "VocabularyReviewSubmission_userId_vocabularyId_clientSubmissionId_key" ON "VocabularyReviewSubmission"("userId", "vocabularyId", "clientSubmissionId");
CREATE INDEX "VocabularyReviewSubmission_userId_createdAt_idx" ON "VocabularyReviewSubmission"("userId", "createdAt");
ALTER TABLE "VocabularyMasteryState" ADD CONSTRAINT "VocabularyMasteryState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VocabularyMasteryState" ADD CONSTRAINT "VocabularyMasteryState_vocabularyId_fkey" FOREIGN KEY ("vocabularyId") REFERENCES "GovernedVocabularyItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VocabularyReviewSubmission" ADD CONSTRAINT "VocabularyReviewSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VocabularyReviewSubmission" ADD CONSTRAINT "VocabularyReviewSubmission_vocabularyId_fkey" FOREIGN KEY ("vocabularyId") REFERENCES "GovernedVocabularyItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Manual rollback, owner approval only: drop these tables and constraints in reverse order.
