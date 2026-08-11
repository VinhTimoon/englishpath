-- EP4-ST003 additive local migration. Apply only after review to an approved
-- local/staging database; autonomous story execution must not run migrations.
ALTER TABLE "ToeicSpeakingSubmission"
  ADD COLUMN "contentType" TEXT NOT NULL DEFAULT 'audio/webm';

CREATE TYPE "ToeicSpeakingRecordingState" AS ENUM
  ('PENDING', 'AVAILABLE', 'REVOKED', 'EXPIRED', 'DELETED');

CREATE TABLE "ToeicSpeakingRecording" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "objectKey" TEXT NOT NULL,
  "state" "ToeicSpeakingRecordingState" NOT NULL DEFAULT 'PENDING',
  "contentType" TEXT NOT NULL,
  "durationSeconds" INTEGER NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ToeicSpeakingRecording_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ToeicSpeakingPlaybackCapability" (
  "id" TEXT NOT NULL,
  "recordingId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "ToeicSpeakingPlaybackCapability_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ToeicSpeakingRecording_submissionId_key"
  ON "ToeicSpeakingRecording"("submissionId");
CREATE INDEX "ToeicSpeakingRecording_userId_state_expiresAt_idx"
  ON "ToeicSpeakingRecording"("userId", "state", "expiresAt");
CREATE INDEX "ToeicSpeakingRecording_sessionId_userId_idx"
  ON "ToeicSpeakingRecording"("sessionId", "userId");
CREATE UNIQUE INDEX "ToeicSpeakingPlaybackCapability_tokenHash_key"
  ON "ToeicSpeakingPlaybackCapability"("tokenHash");
CREATE INDEX "ToeicSpeakingPlaybackCapability_recordingId_userId_expiresAt_idx"
  ON "ToeicSpeakingPlaybackCapability"("recordingId", "userId", "expiresAt");

ALTER TABLE "ToeicSpeakingRecording"
  ADD CONSTRAINT "ToeicSpeakingRecording_submissionId_fkey"
  FOREIGN KEY ("submissionId") REFERENCES "ToeicSpeakingSubmission"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ToeicSpeakingRecording"
  ADD CONSTRAINT "ToeicSpeakingRecording_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ToeicSpeakingPlaybackCapability"
  ADD CONSTRAINT "ToeicSpeakingPlaybackCapability_recordingId_fkey"
  FOREIGN KEY ("recordingId") REFERENCES "ToeicSpeakingRecording"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ToeicSpeakingPlaybackCapability"
  ADD CONSTRAINT "ToeicSpeakingPlaybackCapability_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
