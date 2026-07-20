-- Additive governed Daily Sentence content and owner-scoped completion.
CREATE TABLE "GovernedSentence" (
  "id" TEXT NOT NULL, "prompt" TEXT NOT NULL, "expectedAnswer" TEXT NOT NULL,
  "source" TEXT NOT NULL, "license" TEXT NOT NULL, "reviewStatus" TEXT NOT NULL,
  "reviewedAt" TIMESTAMP(3) NOT NULL, "publishStatus" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "GovernedSentence_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "DailySentenceCompletion" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "sentenceId" TEXT NOT NULL,
  "localDate" TIMESTAMP(3) NOT NULL, "submittedAnswer" TEXT NOT NULL, "isCorrect" BOOLEAN NOT NULL,
  "feedback" TEXT NOT NULL, "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DailySentenceCompletion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DailySentenceCompletion_userId_localDate_key" ON "DailySentenceCompletion"("userId", "localDate");
CREATE INDEX "GovernedSentence_reviewStatus_publishStatus_publishedAt_idx" ON "GovernedSentence"("reviewStatus", "publishStatus", "publishedAt");
CREATE INDEX "DailySentenceCompletion_userId_localDate_idx" ON "DailySentenceCompletion"("userId", "localDate");
CREATE INDEX "DailySentenceCompletion_sentenceId_idx" ON "DailySentenceCompletion"("sentenceId");
ALTER TABLE "DailySentenceCompletion" ADD CONSTRAINT "DailySentenceCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailySentenceCompletion" ADD CONSTRAINT "DailySentenceCompletion_sentenceId_fkey" FOREIGN KEY ("sentenceId") REFERENCES "GovernedSentence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "GovernedSentence" ("id","prompt","expectedAnswer","source","license","reviewStatus","reviewedAt","publishStatus","publishedAt","updatedAt") VALUES
('ds-001','I set aside ten minutes to read every morning.','I set aside ten minutes to read every morning.','EnglishPath original fixture 001','CC0-1.0','REVIEWED','2026-07-01T00:00:00Z','PUBLISHED','2026-07-01T00:00:00Z','2026-07-01T00:00:00Z'),
('ds-002','Small habits become strong routines over time.','Small habits become strong routines over time.','EnglishPath original fixture 002','CC0-1.0','REVIEWED','2026-07-01T00:00:00Z','PUBLISHED','2026-07-01T00:00:00Z','2026-07-01T00:00:00Z'),
('ds-003','I review new words before I go to bed.','I review new words before I go to bed.','EnglishPath original fixture 003','CC0-1.0','REVIEWED','2026-07-01T00:00:00Z','PUBLISHED','2026-07-01T00:00:00Z','2026-07-01T00:00:00Z'),
('ds-004','Clear goals help me choose what to practise next.','Clear goals help me choose what to practise next.','EnglishPath original fixture 004','CC0-1.0','REVIEWED','2026-07-01T00:00:00Z','PUBLISHED','2026-07-01T00:00:00Z','2026-07-01T00:00:00Z'),
('ds-005','I listen carefully before I answer a question.','I listen carefully before I answer a question.','EnglishPath original fixture 005','CC0-1.0','REVIEWED','2026-07-01T00:00:00Z','PUBLISHED','2026-07-01T00:00:00Z','2026-07-01T00:00:00Z'),
('ds-006','A short practice session is better than no practice.','A short practice session is better than no practice.','EnglishPath original fixture 006','CC0-1.0','REVIEWED','2026-07-01T00:00:00Z','PUBLISHED','2026-07-01T00:00:00Z','2026-07-01T00:00:00Z'),
('ds-007','I write one useful sentence in my notebook.','I write one useful sentence in my notebook.','EnglishPath original fixture 007','CC0-1.0','REVIEWED','2026-07-01T00:00:00Z','PUBLISHED','2026-07-01T00:00:00Z','2026-07-01T00:00:00Z'),
('ds-008','Mistakes show me what I should practise again.','Mistakes show me what I should practise again.','EnglishPath original fixture 008','CC0-1.0','REVIEWED','2026-07-01T00:00:00Z','PUBLISHED','2026-07-01T00:00:00Z','2026-07-01T00:00:00Z'),
('ds-009','I speak slowly enough to make my meaning clear.','I speak slowly enough to make my meaning clear.','EnglishPath original fixture 009','CC0-1.0','REVIEWED','2026-07-01T00:00:00Z','PUBLISHED','2026-07-01T00:00:00Z','2026-07-01T00:00:00Z'),
('ds-010','Today I will learn one phrase I can use at work.','Today I will learn one phrase I can use at work.','EnglishPath original fixture 010','CC0-1.0','REVIEWED','2026-07-01T00:00:00Z','PUBLISHED','2026-07-01T00:00:00Z','2026-07-01T00:00:00Z'),
('ds-011','Reading aloud helps me notice the rhythm of English.','Reading aloud helps me notice the rhythm of English.','EnglishPath original fixture 011','CC0-1.0','REVIEWED','2026-07-01T00:00:00Z','PUBLISHED','2026-07-01T00:00:00Z','2026-07-01T00:00:00Z'),
('ds-012','I use context to understand an unfamiliar word.','I use context to understand an unfamiliar word.','EnglishPath original fixture 012','CC0-1.0','REVIEWED','2026-07-01T00:00:00Z','PUBLISHED','2026-07-01T00:00:00Z','2026-07-01T00:00:00Z'),
('ds-013','Every clear question creates a useful conversation.','Every clear question creates a useful conversation.','EnglishPath original fixture 013','CC0-1.0','REVIEWED','2026-07-01T00:00:00Z','PUBLISHED','2026-07-01T00:00:00Z','2026-07-01T00:00:00Z'),
('ds-014','I pause and think when I need more time to answer.','I pause and think when I need more time to answer.','EnglishPath original fixture 014','CC0-1.0','REVIEWED','2026-07-01T00:00:00Z','PUBLISHED','2026-07-01T00:00:00Z','2026-07-01T00:00:00Z'),
('ds-015','Progress grows when I return to difficult ideas.','Progress grows when I return to difficult ideas.','EnglishPath original fixture 015','CC0-1.0','REVIEWED','2026-07-01T00:00:00Z','PUBLISHED','2026-07-01T00:00:00Z','2026-07-01T00:00:00Z'),
('ds-016','I check the meaning of a phrase before I use it.','I check the meaning of a phrase before I use it.','EnglishPath original fixture 016','CC0-1.0','REVIEWED','2026-07-01T00:00:00Z','PUBLISHED','2026-07-01T00:00:00Z','2026-07-01T00:00:00Z'),
('ds-017','A calm routine makes learning easier to continue.','A calm routine makes learning easier to continue.','EnglishPath original fixture 017','CC0-1.0','REVIEWED','2026-07-01T00:00:00Z','PUBLISHED','2026-07-01T00:00:00Z','2026-07-01T00:00:00Z'),
('ds-018','I celebrate effort while I build accuracy.','I celebrate effort while I build accuracy.','EnglishPath original fixture 018','CC0-1.0','REVIEWED','2026-07-01T00:00:00Z','PUBLISHED','2026-07-01T00:00:00Z','2026-07-01T00:00:00Z'),
('ds-019','Good notes make tomorrow’s review more focused.','Good notes make tomorrow’s review more focused.','EnglishPath original fixture 019','CC0-1.0','REVIEWED','2026-07-01T00:00:00Z','PUBLISHED','2026-07-01T00:00:00Z','2026-07-01T00:00:00Z'),
('ds-020','I can improve one clear sentence at a time.','I can improve one clear sentence at a time.','EnglishPath original fixture 020','CC0-1.0','REVIEWED','2026-07-01T00:00:00Z','PUBLISHED','2026-07-01T00:00:00Z','2026-07-01T00:00:00Z');

-- Manual rollback (owner-approved only): drop DailySentenceCompletion, GovernedSentence.
