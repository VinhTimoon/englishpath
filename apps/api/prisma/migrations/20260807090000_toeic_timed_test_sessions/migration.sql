-- EP2-ST007 additive migration. Manual rollback (owner approval only):
-- drop ToeicTimedTestAnswer, then ToeicTimedTestSession, then these enums.
CREATE TYPE "ToeicTimedTestMode" AS ENUM ('MINI', 'HALF');
CREATE TYPE "ToeicTimedTestStatus" AS ENUM ('ACTIVE', 'SUBMITTED', 'EXPIRED');
CREATE TABLE "ToeicTimedTestSession" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "clientSessionId" TEXT NOT NULL,
  "mode" "ToeicTimedTestMode" NOT NULL, "policyVersion" TEXT NOT NULL,
  "questionIds" TEXT[] NOT NULL, "startedAt" TIMESTAMP(3) NOT NULL,
  "deadlineAt" TIMESTAMP(3) NOT NULL, "status" "ToeicTimedTestStatus" NOT NULL DEFAULT 'ACTIVE',
  "total" INTEGER NOT NULL, "score" INTEGER, "finalizedAt" TIMESTAMP(3),
  CONSTRAINT "ToeicTimedTestSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ToeicTimedTestSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE TABLE "ToeicTimedTestAnswer" (
  "id" TEXT NOT NULL, "sessionId" TEXT NOT NULL, "questionId" TEXT NOT NULL,
  "selectedOption" TEXT NOT NULL, "isCorrect" BOOLEAN NOT NULL, "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ToeicTimedTestAnswer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ToeicTimedTestAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ToeicTimedTestSession"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "ToeicTimedTestSession_userId_clientSessionId_key" ON "ToeicTimedTestSession"("userId", "clientSessionId");
CREATE UNIQUE INDEX "ToeicTimedTestAnswer_sessionId_questionId_key" ON "ToeicTimedTestAnswer"("sessionId", "questionId");
CREATE INDEX "ToeicTimedTestSession_userId_status_idx" ON "ToeicTimedTestSession"("userId", "status");
CREATE INDEX "ToeicTimedTestSession_deadlineAt_status_idx" ON "ToeicTimedTestSession"("deadlineAt", "status");
CREATE INDEX "ToeicTimedTestAnswer_sessionId_idx" ON "ToeicTimedTestAnswer"("sessionId");
