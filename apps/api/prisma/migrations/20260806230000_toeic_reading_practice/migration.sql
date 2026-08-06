CREATE TABLE "ToeicReadingPracticeSession" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "clientSessionId" TEXT NOT NULL,
  "readingPart" "ToeicPart", "questionIds" TEXT[] NOT NULL, "status" "ToeicPracticeStatus" NOT NULL DEFAULT 'ACTIVE',
  "total" INTEGER NOT NULL, "score" INTEGER, "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "submittedAt" TIMESTAMP(3),
  CONSTRAINT "ToeicReadingPracticeSession_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ToeicReadingPracticeAnswer" (
  "id" TEXT NOT NULL, "sessionId" TEXT NOT NULL, "questionId" TEXT NOT NULL, "selectedOption" TEXT NOT NULL,
  "isCorrect" BOOLEAN NOT NULL, "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ToeicReadingPracticeAnswer_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ToeicReadingPracticeSession_userId_clientSessionId_key" ON "ToeicReadingPracticeSession"("userId","clientSessionId");
CREATE INDEX "ToeicReadingPracticeSession_userId_status_idx" ON "ToeicReadingPracticeSession"("userId","status");
CREATE UNIQUE INDEX "ToeicReadingPracticeAnswer_sessionId_questionId_key" ON "ToeicReadingPracticeAnswer"("sessionId","questionId");
CREATE INDEX "ToeicReadingPracticeAnswer_sessionId_idx" ON "ToeicReadingPracticeAnswer"("sessionId");
ALTER TABLE "ToeicReadingPracticeSession" ADD CONSTRAINT "ToeicReadingPracticeSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ToeicReadingPracticeAnswer" ADD CONSTRAINT "ToeicReadingPracticeAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ToeicReadingPracticeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
