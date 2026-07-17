-- Additive daily practice, progress, and private error-review baseline.
CREATE TYPE "PracticeStatus" AS ENUM ('ACTIVE', 'SUBMITTED');

CREATE TABLE "PracticeSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "clientSessionId" TEXT NOT NULL,
  "practiceDay" TIMESTAMP(3) NOT NULL,
  "questionIds" TEXT[],
  "status" "PracticeStatus" NOT NULL DEFAULT 'ACTIVE',
  "score" INTEGER NOT NULL DEFAULT 0,
  "total" INTEGER NOT NULL DEFAULT 5,
  "xpAwarded" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submittedAt" TIMESTAMP(3),
  CONSTRAINT "PracticeSession_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PracticeAnswer" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "selectedOption" TEXT NOT NULL,
  "isCorrect" BOOLEAN NOT NULL,
  "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PracticeAnswer_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "LearnerProgress" (
  "userId" TEXT NOT NULL,
  "xp" INTEGER NOT NULL DEFAULT 0,
  "streakDays" INTEGER NOT NULL DEFAULT 0,
  "lastPracticeOn" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LearnerProgress_pkey" PRIMARY KEY ("userId")
);
CREATE TABLE "ErrorNotebookEntry" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "selectedOption" TEXT NOT NULL,
  "correctOption" TEXT NOT NULL,
  "explanation" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ErrorNotebookEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PracticeSession_userId_clientSessionId_key" ON "PracticeSession"("userId", "clientSessionId");
CREATE UNIQUE INDEX "PracticeSession_userId_practiceDay_key" ON "PracticeSession"("userId", "practiceDay");
CREATE INDEX "PracticeSession_userId_status_startedAt_idx" ON "PracticeSession"("userId", "status", "startedAt");
CREATE UNIQUE INDEX "PracticeAnswer_sessionId_questionId_key" ON "PracticeAnswer"("sessionId", "questionId");
CREATE UNIQUE INDEX "ErrorNotebookEntry_sessionId_questionId_key" ON "ErrorNotebookEntry"("sessionId", "questionId");
CREATE INDEX "ErrorNotebookEntry_userId_createdAt_idx" ON "ErrorNotebookEntry"("userId", "createdAt");
ALTER TABLE "PracticeSession" ADD CONSTRAINT "PracticeSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PracticeAnswer" ADD CONSTRAINT "PracticeAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PracticeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearnerProgress" ADD CONSTRAINT "LearnerProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ErrorNotebookEntry" ADD CONSTRAINT "ErrorNotebookEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ErrorNotebookEntry" ADD CONSTRAINT "ErrorNotebookEntry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PracticeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Manual rollback (owner-approved only): drop ErrorNotebookEntry, LearnerProgress,
-- PracticeAnswer, PracticeSession, then PracticeStatus. Never run automatically.
