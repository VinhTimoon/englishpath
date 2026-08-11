import type {
  LearningGoal,
  LearningSkill,
  ProficiencyLevel,
} from '../onboarding/onboarding.models';

export const ROADMAP_REPOSITORY = Symbol('ROADMAP_REPOSITORY');
export const ROADMAP_ADAPTIVE_POLICY = 'adaptive-roadmap-v1' as const;
export const ROADMAP_ITEM_STATUSES = [
  'PENDING',
  'COMPLETED',
  'SKIPPED',
] as const;

export type RoadmapItemStatus = (typeof ROADMAP_ITEM_STATUSES)[number];
export type RoadmapPhase =
  'FOUNDATION' | 'SKILL_BUILDING' | 'PRACTICE_CORRECTION' | 'SIMULATION_REVIEW';
export type RoadmapTaskType =
  | 'VOCABULARY'
  | 'GRAMMAR'
  | 'LISTENING'
  | 'READING'
  | 'SPEAKING'
  | 'WRITING'
  | 'DAILY_SENTENCE'
  | 'TOEIC_PART'
  | 'REVIEW'
  | 'SIMULATION';

export type RoadmapSeed = Readonly<{
  goal: LearningGoal;
  level: ProficiencyLevel;
  durationDays: 30 | 60 | 90 | 120;
  dailyMinutes: number;
  prioritySkills: readonly LearningSkill[];
}>;

export type RoadmapItemDraft = Readonly<{
  dayNumber: number;
  sequence: number;
  phase: RoadmapPhase;
  skill: LearningSkill;
  taskType: RoadmapTaskType;
  title: string;
  minutes: number;
  status: RoadmapItemStatus;
  completedAt?: Date | null;
}>;

export type RoadmapItemView = RoadmapItemDraft &
  Readonly<{
    id: string;
    status: RoadmapItemStatus;
    completedAt: Date | null;
  }>;

export type RoadmapView = Omit<RoadmapSeed, 'prioritySkills'> &
  Readonly<{
    id: string;
    version: number;
    status: 'ACTIVE' | 'SUPERSEDED';
    previousRoadmapId: string | null;
    generatedAt: Date;
    items: readonly RoadmapItemView[];
  }>;
