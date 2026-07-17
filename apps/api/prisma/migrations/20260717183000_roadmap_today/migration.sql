-- Additive learner roadmap baseline. This migration does not update or delete data.
CREATE TYPE "RoadmapStatus" AS ENUM ('ACTIVE', 'SUPERSEDED');
CREATE TYPE "RoadmapPhase" AS ENUM ('FOUNDATION', 'SKILL_BUILDING', 'PRACTICE_CORRECTION', 'SIMULATION_REVIEW');
CREATE TYPE "RoadmapTaskType" AS ENUM ('VOCABULARY', 'GRAMMAR', 'LISTENING', 'READING', 'SPEAKING', 'WRITING', 'DAILY_SENTENCE', 'TOEIC_PART', 'REVIEW', 'SIMULATION');
CREATE TYPE "RoadmapItemStatus" AS ENUM ('PENDING', 'COMPLETED', 'SKIPPED');

CREATE TABLE "Roadmap" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "goal" "LearningGoal" NOT NULL,
  "level" "ProficiencyLevel" NOT NULL,
  "durationDays" INTEGER NOT NULL,
  "dailyMinutes" INTEGER NOT NULL,
  "status" "RoadmapStatus" NOT NULL DEFAULT 'ACTIVE',
  "previousRoadmapId" TEXT,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "supersededAt" TIMESTAMP(3),
  CONSTRAINT "Roadmap_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Roadmap_durationDays_check" CHECK ("durationDays" IN (30, 60, 90, 120)),
  CONSTRAINT "Roadmap_dailyMinutes_check" CHECK ("dailyMinutes" BETWEEN 10 AND 60)
);

CREATE TABLE "RoadmapItem" (
  "id" TEXT NOT NULL,
  "roadmapId" TEXT NOT NULL,
  "dayNumber" INTEGER NOT NULL,
  "sequence" INTEGER NOT NULL,
  "phase" "RoadmapPhase" NOT NULL,
  "skill" "LearningSkill" NOT NULL,
  "taskType" "RoadmapTaskType" NOT NULL,
  "title" TEXT NOT NULL,
  "minutes" INTEGER NOT NULL,
  "status" "RoadmapItemStatus" NOT NULL DEFAULT 'PENDING',
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "RoadmapItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RoadmapItem_dayNumber_check" CHECK ("dayNumber" BETWEEN 1 AND 120),
  CONSTRAINT "RoadmapItem_minutes_check" CHECK ("minutes" BETWEEN 1 AND 60)
);

CREATE UNIQUE INDEX "Roadmap_userId_version_key" ON "Roadmap"("userId", "version");
CREATE UNIQUE INDEX "Roadmap_one_active_per_user_key" ON "Roadmap"("userId") WHERE "status" = 'ACTIVE';
CREATE INDEX "Roadmap_userId_status_idx" ON "Roadmap"("userId", "status");
CREATE INDEX "Roadmap_previousRoadmapId_idx" ON "Roadmap"("previousRoadmapId");
CREATE UNIQUE INDEX "RoadmapItem_roadmapId_dayNumber_sequence_key" ON "RoadmapItem"("roadmapId", "dayNumber", "sequence");
CREATE INDEX "RoadmapItem_roadmapId_dayNumber_status_idx" ON "RoadmapItem"("roadmapId", "dayNumber", "status");

ALTER TABLE "Roadmap" ADD CONSTRAINT "Roadmap_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Roadmap" ADD CONSTRAINT "Roadmap_previousRoadmapId_fkey" FOREIGN KEY ("previousRoadmapId") REFERENCES "Roadmap"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RoadmapItem" ADD CONSTRAINT "RoadmapItem_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "Roadmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Manual rollback (owner-approved only): drop RoadmapItem, then Roadmap, then the four
-- roadmap enums. Never run rollback automatically because it removes learner plans.
