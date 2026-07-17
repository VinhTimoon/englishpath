export const LEARNING_GOALS = [
  'ENGLISH_FOUNDATION',
  'DAILY_COMMUNICATION',
  'FOUR_SKILL_ENGLISH',
  'WORKPLACE_ENGLISH',
  'TOEIC_LISTENING_READING',
  'TOEIC_SPEAKING_WRITING',
  'TOEIC_FOUR_SKILLS',
] as const;
export const PROFICIENCY_LEVELS = [
  'BEGINNER',
  'ELEMENTARY',
  'INTERMEDIATE',
  'UPPER_INTERMEDIATE',
  'ADVANCED',
] as const;
export const LEARNING_SKILLS = [
  'VOCABULARY',
  'GRAMMAR',
  'LISTENING',
  'READING',
  'SPEAKING',
  'WRITING',
] as const;

export type LearningGoal = (typeof LEARNING_GOALS)[number];
export type ProficiencyLevel = (typeof PROFICIENCY_LEVELS)[number];
export type LearningSkill = (typeof LEARNING_SKILLS)[number];

export type OnboardingInput = Readonly<{
  primaryGoal: LearningGoal;
  secondaryGoals: readonly LearningGoal[];
  currentLevel: ProficiencyLevel;
  dailyMinutes: number;
  targetDays: 30 | 60 | 90 | 120;
  prioritySkills: readonly LearningSkill[];
}>;

export type PlacementAnswer = Readonly<{
  questionId: string;
  optionId: string;
}>;

export type PlacementResult = Readonly<{
  id: string;
  score: number;
  total: number;
  level: ProficiencyLevel;
  skillBreakdown: Readonly<Record<string, { correct: number; total: number }>>;
  submittedAt: Date;
}>;

export const ONBOARDING_REPOSITORY = Symbol('ONBOARDING_REPOSITORY');
