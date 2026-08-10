-- EP4-ST007 additive local migration. Apply only after review to an approved
-- local/staging database; autonomous story execution must not run migrations.
CREATE TYPE "AiFeedbackOutcome" AS ENUM ('ALLOWED', 'DENIED', 'PROVIDER_UNAVAILABLE');

CREATE TABLE "AiFeedbackUsage" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "feature" TEXT NOT NULL,
  "skill" TEXT NOT NULL,
  "policyVersion" TEXT NOT NULL,
  "promptVersion" TEXT NOT NULL,
  "adapterKind" TEXT NOT NULL,
  "modelVersion" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "requestFingerprint" TEXT NOT NULL,
  "outcome" "AiFeedbackOutcome" NOT NULL,
  "estimatedCostMicros" INTEGER NOT NULL,
  "quotaRemaining" INTEGER NOT NULL,
  "feedbackJson" JSONB,
  "correlationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiFeedbackUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiFeedbackUsage_userId_idempotencyKey_key"
  ON "AiFeedbackUsage"("userId", "idempotencyKey");
CREATE INDEX "AiFeedbackUsage_userId_createdAt_idx"
  ON "AiFeedbackUsage"("userId", "createdAt");
CREATE INDEX "AiFeedbackUsage_userId_outcome_createdAt_idx"
  ON "AiFeedbackUsage"("userId", "outcome", "createdAt");

ALTER TABLE "AiFeedbackUsage"
  ADD CONSTRAINT "AiFeedbackUsage_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
