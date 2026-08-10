-- EP4-ST002 additive local migration. Apply only after review to an approved
-- local/staging database; autonomous story execution must not run migrations.
CREATE TYPE "ToeicSpeakingSessionStatus" AS ENUM ('ACTIVE', 'FINALIZED', 'CANCELLED');

CREATE TABLE "ToeicSpeakingSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "taskVersion" TEXT NOT NULL,
  "startIdempotencyKey" TEXT NOT NULL,
  "status" "ToeicSpeakingSessionStatus" NOT NULL DEFAULT 'ACTIVE',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finalizedAt" TIMESTAMP(3),
  CONSTRAINT "ToeicSpeakingSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ToeicSpeakingSubmission" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "responseMode" TEXT NOT NULL,
  "durationSeconds" INTEGER NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "submissionReference" TEXT NOT NULL,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ToeicSpeakingSubmission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ToeicSpeakingSession_userId_startIdempotencyKey_key"
  ON "ToeicSpeakingSession"("userId", "startIdempotencyKey");
CREATE INDEX "ToeicSpeakingSession_userId_status_startedAt_idx"
  ON "ToeicSpeakingSession"("userId", "status", "startedAt");
CREATE INDEX "ToeicSpeakingSession_taskId_taskVersion_status_idx"
  ON "ToeicSpeakingSession"("taskId", "taskVersion", "status");
CREATE UNIQUE INDEX "ToeicSpeakingSubmission_sessionId_key"
  ON "ToeicSpeakingSubmission"("sessionId");
CREATE UNIQUE INDEX "ToeicSpeakingSubmission_userId_idempotencyKey_key"
  ON "ToeicSpeakingSubmission"("userId", "idempotencyKey");
CREATE INDEX "ToeicSpeakingSubmission_userId_submittedAt_idx"
  ON "ToeicSpeakingSubmission"("userId", "submittedAt");

ALTER TABLE "ToeicSpeakingSession"
  ADD CONSTRAINT "ToeicSpeakingSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ToeicSpeakingSubmission"
  ADD CONSTRAINT "ToeicSpeakingSubmission_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "ToeicSpeakingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ToeicSpeakingSubmission"
  ADD CONSTRAINT "ToeicSpeakingSubmission_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
