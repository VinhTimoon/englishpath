-- EP2-ST010 additive local migration. Apply only to the local database after review.
-- Rollback (owner-approved local operation): delete TOEIC entries, drop the TOEIC
-- foreign key/indexes, restore NOT NULL sessionId, then drop the source column/type.
CREATE TYPE "ErrorNotebookSource" AS ENUM ('PRACTICE', 'TOEIC_TIMED_TEST');
ALTER TABLE "ErrorNotebookEntry" ADD COLUMN "source" "ErrorNotebookSource" NOT NULL DEFAULT 'PRACTICE';
ALTER TABLE "ErrorNotebookEntry" ALTER COLUMN "sessionId" DROP NOT NULL;
ALTER TABLE "ErrorNotebookEntry" ADD COLUMN "toeicTimedTestSessionId" TEXT;
ALTER TABLE "ErrorNotebookEntry" ADD CONSTRAINT "ErrorNotebookEntry_toeicTimedTestSessionId_fkey"
  FOREIGN KEY ("toeicTimedTestSessionId") REFERENCES "ToeicTimedTestSession"("id") ON DELETE CASCADE;
CREATE UNIQUE INDEX "ErrorNotebookEntry_toeicTimedTestSessionId_questionId_key"
  ON "ErrorNotebookEntry"("toeicTimedTestSessionId", "questionId");
CREATE INDEX "ErrorNotebookEntry_userId_source_createdAt_idx"
  ON "ErrorNotebookEntry"("userId", "source", "createdAt");
ALTER TABLE "ErrorNotebookEntry" ADD CONSTRAINT "ErrorNotebookEntry_source_reference_check"
  CHECK (("source" = 'PRACTICE' AND "sessionId" IS NOT NULL AND "toeicTimedTestSessionId" IS NULL)
      OR ("source" = 'TOEIC_TIMED_TEST' AND "sessionId" IS NULL AND "toeicTimedTestSessionId" IS NOT NULL));
