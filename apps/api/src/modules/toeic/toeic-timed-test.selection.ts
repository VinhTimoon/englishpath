import type { TimedPrivateQuestion } from './toeic-timed-test.models';

/**
 * The repository query is ordered newest-first for each canonical question.
 * This pure boundary keeps the first row and makes the rule directly testable.
 */
export function selectNewestByCanonical(
  questions: readonly TimedPrivateQuestion[],
) {
  const current = new Map<string, TimedPrivateQuestion>();
  for (const question of questions) {
    if (!current.has(question.questionId)) {
      current.set(question.questionId, question);
    }
  }
  return [...current.values()];
}
