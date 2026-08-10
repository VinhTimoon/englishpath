-- EP4-ST005 additive local migration. Apply only after review to an approved
-- local/staging database; autonomous story execution must not run migrations.
CREATE TYPE "ToeicWritingSessionStatus" AS ENUM ('ACTIVE', 'FINALIZED', 'CANCELLED');

CREATE TABLE "ToeicWritingSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "taskVersion" TEXT NOT NULL,
  "startIdempotencyKey" TEXT NOT NULL,
  "status" "ToeicWritingSessionStatus" NOT NULL DEFAULT 'ACTIVE',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finalizedAt" TIMESTAMP(3),
  CONSTRAINT "ToeicWritingSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ToeicWritingSubmission" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "responseMode" TEXT NOT NULL,
  "wordCount" INTEGER NOT NULL,
  "characterCount" INTEGER NOT NULL,
  "submittedText" TEXT NOT NULL,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ToeicWritingSubmission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ToeicWritingSession_userId_startIdempotencyKey_key"
  ON "ToeicWritingSession"("userId", "startIdempotencyKey");
CREATE INDEX "ToeicWritingSession_userId_status_startedAt_idx"
  ON "ToeicWritingSession"("userId", "status", "startedAt");
CREATE INDEX "ToeicWritingSession_taskId_taskVersion_status_idx"
  ON "ToeicWritingSession"("taskId", "taskVersion", "status");
CREATE UNIQUE INDEX "ToeicWritingSubmission_sessionId_key"
  ON "ToeicWritingSubmission"("sessionId");
CREATE UNIQUE INDEX "ToeicWritingSubmission_userId_idempotencyKey_key"
  ON "ToeicWritingSubmission"("userId", "idempotencyKey");
CREATE INDEX "ToeicWritingSubmission_userId_submittedAt_idx"
  ON "ToeicWritingSubmission"("userId", "submittedAt");

ALTER TABLE "ToeicWritingSession"
  ADD CONSTRAINT "ToeicWritingSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ToeicWritingSubmission"
  ADD CONSTRAINT "ToeicWritingSubmission_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "ToeicWritingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ToeicWritingSubmission"
  ADD CONSTRAINT "ToeicWritingSubmission_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
