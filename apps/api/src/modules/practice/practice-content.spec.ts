import { PRACTICE_QUESTIONS } from './practice.fixture';

describe('reviewed daily-practice content baseline', () => {
  it('contains five stable, governed cards with valid answer keys', () => {
    expect(PRACTICE_QUESTIONS).toHaveLength(5);
    expect(PRACTICE_QUESTIONS.map(({ id }) => id)).toEqual([
      'p1',
      'p2',
      'p3',
      'p4',
      'p5',
    ]);

    for (const [index, question] of PRACTICE_QUESTIONS.entries()) {
      expect(question.source).toBe(
        `EnglishPath original quiz fixture ${String(index + 1).padStart(3, '0')}`,
      );
      expect(question.license).toBe('CC0-1.0');
      expect(question.reviewStatus).toBe('REVIEWED');
      expect(question.publishStatus).toBe('PUBLISHED');
      expect(question.reviewedAt).toBe('2026-08-06T00:00:00.000Z');
      expect(question.publishedAt).toBe(question.reviewedAt);
      expect(question.prompt.length).toBeGreaterThan(10);
      expect(question.explanation.length).toBeGreaterThan(10);
      expect(question.options).toHaveLength(3);
      expect(new Set(question.options.map(({ id }) => id)).size).toBe(3);
      expect(question.options.map(({ id }) => id)).toContain(
        question.correctOption,
      );
    }
  });

  it('keeps answer keys and governance metadata out of the start projection', () => {
    const publicQuestions = PRACTICE_QUESTIONS.map(
      ({ id, prompt, options }) => ({
        id,
        prompt,
        options,
      }),
    );
    const serialized = JSON.stringify(publicQuestions);

    expect(serialized).not.toMatch(
      /correctOption|explanation|source|license|reviewStatus|publishStatus|reviewedAt|publishedAt/,
    );
  });
});
