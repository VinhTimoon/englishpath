import {
  allocateFourSkills,
  FOUR_SKILLS,
  learnerSafeFourSkillsProjection,
  validateFourSkillsMetadata,
} from './four-skills.balance';

const evidence = {
  completedBySkill: { READING: 4, LISTENING: 1, SPEAKING: 0, WRITING: 2 },
  targetPerDay: 4,
} as const;
const pool = FOUR_SKILLS.map((skill) => ({
  reference: `${skill.toLowerCase()}-1`,
  skill,
  kind: skill,
  target: 10,
}));

describe('four skills balance policy', () => {
  it('accepts exactly the canonical buckets and rejects invalid metadata', () => {
    expect(
      validateFourSkillsMetadata([
        'WRITING',
        'SPEAKING',
        'LISTENING',
        'READING',
      ]),
    ).toEqual(FOUR_SKILLS);
    expect(() =>
      validateFourSkillsMetadata(['READING', 'READING', 'SPEAKING', 'WRITING']),
    ).toThrow();
    expect(() =>
      validateFourSkillsMetadata(['READING', 'LISTENING', 'SPEAKING', 'OTHER']),
    ).toThrow();
  });

  it('is deterministic and favors underrepresented skills', () => {
    const first = allocateFourSkills(evidence, pool);
    expect(first).toEqual(allocateFourSkills(evidence, [...pool].reverse()));
    expect(first.map(({ skill }) => skill)).toContain('SPEAKING');
    expect(first).toHaveLength(4);
  });

  it('preserves required and due activities within the bound', () => {
    const result = allocateFourSkills({ ...evidence, targetPerDay: 2 }, [
      { ...pool[0], required: true },
      { ...pool[1], due: true },
      ...pool.slice(2),
    ]);
    expect(result.map(({ reason }) => reason)).toEqual(['REQUIRED', 'DUE']);
  });

  it('returns a learner-safe unavailable projection', () => {
    const result = allocateFourSkills(
      { ...evidence, targetPerDay: 4 },
      pool.filter(({ skill }) => skill !== 'WRITING'),
    );
    const writing = result.find(({ skill }) => skill === 'WRITING');
    expect(learnerSafeFourSkillsProjection(writing!)).toEqual(
      expect.objectContaining({
        skill: 'WRITING',
        reference: null,
        completionState: 'PENDING',
      }),
    );
  });
});
