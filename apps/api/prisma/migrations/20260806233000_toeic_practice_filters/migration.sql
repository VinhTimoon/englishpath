ALTER TABLE "ToeicPracticeSession"
  ADD COLUMN "difficulty" "ToeicDifficulty";

ALTER TABLE "ToeicReadingPracticeSession"
  ADD COLUMN "difficulty" "ToeicDifficulty",
  ADD COLUMN "topic" TEXT;
