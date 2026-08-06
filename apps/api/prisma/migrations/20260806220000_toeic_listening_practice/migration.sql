CREATE TYPE "ToeicPracticeStatus" AS ENUM ('ACTIVE','SUBMITTED');
CREATE TABLE "ToeicPracticeSession" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "clientSessionId" TEXT NOT NULL,
  "listeningPart" "ToeicPart", "questionIds" TEXT[] NOT NULL,
  "status" "ToeicPracticeStatus" NOT NULL DEFAULT 'ACTIVE', "total" INTEGER NOT NULL,
  "score" INTEGER, "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submittedAt" TIMESTAMP(3), CONSTRAINT "ToeicPracticeSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ToeicPracticeSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "ToeicPracticeAnswer" (
  "id" TEXT NOT NULL, "sessionId" TEXT NOT NULL, "questionId" TEXT NOT NULL,
  "selectedOption" TEXT NOT NULL, "isCorrect" BOOLEAN NOT NULL,
  "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ToeicPracticeAnswer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ToeicPracticeAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ToeicPracticeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ToeicPracticeSession_userId_clientSessionId_key" ON "ToeicPracticeSession"("userId","clientSessionId");
CREATE INDEX "ToeicPracticeSession_userId_status_idx" ON "ToeicPracticeSession"("userId","status");
CREATE UNIQUE INDEX "ToeicPracticeAnswer_sessionId_questionId_key" ON "ToeicPracticeAnswer"("sessionId","questionId");
CREATE INDEX "ToeicPracticeAnswer_sessionId_idx" ON "ToeicPracticeAnswer"("sessionId");
