import type {
  OnboardingInput,
  PlacementAnswer,
  PlacementResult,
  ProficiencyLevel,
} from './onboarding.models';

export interface OnboardingRepository {
  find(
    userId: string,
  ): Promise<(OnboardingInput & { completedAt: Date }) | null>;
  upsert(
    userId: string,
    input: OnboardingInput,
  ): Promise<OnboardingInput & { completedAt: Date }>;
  findLatestPlacement(userId: string): Promise<PlacementResult | null>;
  createPlacement(input: {
    userId: string;
    clientSubmissionId: string;
    answers: readonly PlacementAnswer[];
    score: number;
    total: number;
    level: ProficiencyLevel;
    skillBreakdown: PlacementResult['skillBreakdown'];
  }): Promise<PlacementResult>;
}
