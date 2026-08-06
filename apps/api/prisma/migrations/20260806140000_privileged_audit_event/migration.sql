-- EP1-ST028: additive privileged audit boundary.
-- Rollback is owner-approved only: drop the foreign key, indexes, table, and enum
-- in that order. Never run rollback automatically against shared or production data.

CREATE TYPE "AuditPolicyResult" AS ENUM ('ALLOW', 'DENY');

CREATE TABLE "PrivilegedAuditEvent" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "policyResult" "AuditPolicyResult" NOT NULL,
    "correlationId" TEXT NOT NULL,
    "attributes" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivilegedAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PrivilegedAuditEvent_actorUserId_occurredAt_idx"
  ON "PrivilegedAuditEvent"("actorUserId", "occurredAt");
CREATE INDEX "PrivilegedAuditEvent_action_occurredAt_idx"
  ON "PrivilegedAuditEvent"("action", "occurredAt");
CREATE INDEX "PrivilegedAuditEvent_correlationId_idx"
  ON "PrivilegedAuditEvent"("correlationId");

ALTER TABLE "PrivilegedAuditEvent"
  ADD CONSTRAINT "PrivilegedAuditEvent_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
