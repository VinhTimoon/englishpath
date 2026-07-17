import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { ApplicationPrincipal } from '../access';
import {
  ONBOARDING_REPOSITORY,
  type OnboardingInput,
  type PlacementAnswer,
  type ProficiencyLevel,
} from './onboarding.models';
import type { OnboardingRepository } from './onboarding.ports';
import { PLACEMENT_ANSWER_KEY, PLACEMENT_QUESTIONS } from './placement.fixture';

@Injectable()
export class OnboardingService {
  constructor(
    @Inject(ONBOARDING_REPOSITORY)
    private readonly repository: OnboardingRepository,
  ) {}

  getOnboarding(principal: ApplicationPrincipal) {
    return this.repository.find(principal.applicationUserId);
  }

  submitOnboarding(principal: ApplicationPrincipal, input: OnboardingInput) {
    if (input.secondaryGoals.includes(input.primaryGoal)) {
      throw new BadRequestException();
    }
    return this.repository.upsert(principal.applicationUserId, input);
  }

  getQuestions() {
    return PLACEMENT_QUESTIONS.map(({ id, skill, prompt, options }) => ({
      id,
      skill,
      prompt,
      options,
    }));
  }

  getLatestResult(principal: ApplicationPrincipal) {
    return this.repository.findLatestPlacement(principal.applicationUserId);
  }

  submitPlacement(
    principal: ApplicationPrincipal,
    clientSubmissionId: string,
    answers: readonly PlacementAnswer[],
  ) {
    const uniqueQuestions = new Set(
      answers.map(({ questionId }) => questionId),
    );
    if (
      uniqueQuestions.size !== PLACEMENT_QUESTIONS.length ||
      answers.some(({ questionId, optionId }) => {
        const question = PLACEMENT_QUESTIONS.find(
          ({ id }) => id === questionId,
        );
        return !question?.options.some(({ id }) => id === optionId);
      })
    ) {
      throw new BadRequestException();
    }

    const breakdown: Record<string, { correct: number; total: number }> = {};
    let score = 0;
    for (const question of PLACEMENT_QUESTIONS) {
      const correct =
        answers.find(({ questionId }) => questionId === question.id)
          ?.optionId === PLACEMENT_ANSWER_KEY[question.id];
      const current = breakdown[question.skill] ?? { correct: 0, total: 0 };
      breakdown[question.skill] = {
        correct: current.correct + (correct ? 1 : 0),
        total: current.total + 1,
      };
      if (correct) score += 1;
    }

    return this.repository.createPlacement({
      userId: principal.applicationUserId,
      clientSubmissionId,
      answers,
      score,
      total: PLACEMENT_QUESTIONS.length,
      level: this.levelFor(score),
      skillBreakdown: breakdown,
    });
  }

  private levelFor(score: number): ProficiencyLevel {
    if (score >= 9) return 'ADVANCED';
    if (score >= 7) return 'UPPER_INTERMEDIATE';
    if (score >= 5) return 'INTERMEDIATE';
    if (score >= 3) return 'ELEMENTARY';
    return 'BEGINNER';
  }
}
