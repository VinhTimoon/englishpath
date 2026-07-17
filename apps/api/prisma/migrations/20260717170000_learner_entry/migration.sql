CREATE TYPE "LearningGoal" AS ENUM (
  'ENGLISH_FOUNDATION', 'DAILY_COMMUNICATION', 'FOUR_SKILL_ENGLISH',
  'WORKPLACE_ENGLISH', 'TOEIC_LISTENING_READING',
  'TOEIC_SPEAKING_WRITING', 'TOEIC_FOUR_SKILLS'
);
CREATE TYPE "ProficiencyLevel" AS ENUM (
  'BEGINNER', 'ELEMENTARY', 'INTERMEDIATE', 'UPPER_INTERMEDIATE', 'ADVANCED'
);
CREATE TYPE "LearningSkill" AS ENUM (
  'VOCABULARY', 'GRAMMAR', 'LISTENING', 'READING', 'SPEAKING', 'WRITING'
);

CREATE TABLE "LearnerOnboarding" (
  "userId" TEXT NOT NULL,
  "primaryGoal" "LearningGoal" NOT NULL,
  "secondaryGoals" "LearningGoal"[] NOT NULL DEFAULT ARRAY[]::"LearningGoal"[],
  "currentLevel" "ProficiencyLevel" NOT NULL,
  "dailyMinutes" INTEGER NOT NULL,
  "targetDays" INTEGER NOT NULL,
  "prioritySkills" "LearningSkill"[] NOT NULL DEFAULT ARRAY[]::"LearningSkill"[],
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LearnerOnboarding_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "LearnerOnboarding_dailyMinutes_check" CHECK ("dailyMinutes" BETWEEN 10 AND 120),
  CONSTRAINT "LearnerOnboarding_targetDays_check" CHECK ("targetDays" IN (30, 60, 90, 120))
);

CREATE TABLE "PlacementAttempt" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "clientSubmissionId" TEXT NOT NULL,
  "answers" JSONB NOT NULL,
  "score" INTEGER NOT NULL,
  "total" INTEGER NOT NULL,
  "level" "ProficiencyLevel" NOT NULL,
  "skillBreakdown" JSONB NOT NULL,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlacementAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlacementAttempt_score_check" CHECK ("score" BETWEEN 0 AND "total")
);

CREATE UNIQUE INDEX "PlacementAttempt_userId_clientSubmissionId_key"
ON "PlacementAttempt"("userId", "clientSubmissionId");
CREATE INDEX "PlacementAttempt_userId_submittedAt_idx"
ON "PlacementAttempt"("userId", "submittedAt");

ALTER TABLE "LearnerOnboarding" ADD CONSTRAINT "LearnerOnboarding_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlacementAttempt" ADD CONSTRAINT "PlacementAttempt_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Rollback (manual only): drop PlacementAttempt, LearnerOnboarding, then LearningSkill,
-- ProficiencyLevel, and LearningGoal. Existing user/profile/role data is unaffected.
