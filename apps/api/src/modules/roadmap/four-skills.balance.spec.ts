import {
  allocateFourSkills,
  FOUR_SKILLS,
  learnerSafeFourSkillsProjection,
  recalculateFourSkills,
  type FourSkillsActivity,
  validateFourSkillsMetadata,
} from './four-skills.balance';

const evidence = {
  completedBySkill: { READING: 4, LISTENING: 1, SPEAKING: 0, WRITING: 2 },
  targetPerDay: 4,
} as const;
const pool: readonly FourSkillsActivity[] = FOUR_SKILLS.map((skill) => ({
  reference: `${skill.toLowerCase()}-1`,
  skill,
  kind: skill,
  target: 10,
  source:
    skill === 'SPEAKING' || skill === 'WRITING' ? 'TOEIC_TASK' : 'ROADMAP',
  published: skill === 'SPEAKING' || skill === 'WRITING',
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

  it('fails closed for unpublished speaking/writing references', () => {
    const result = allocateFourSkills(evidence, [
      ...pool.filter(({ skill }) => skill !== 'WRITING'),
      { ...pool[3], published: false },
    ]);
    expect(result.find(({ skill }) => skill === 'WRITING')).toMatchObject({
      activity: null,
      reason: 'UNAVAILABLE',
    });
  });

  it('returns stable initial, unchanged, and changed recalculation reasons', () => {
    const initial = recalculateFourSkills(evidence, pool);
    expect(initial.reason).toBe('INITIAL');
    expect(recalculateFourSkills(evidence, pool, initial).reason).toBe(
      'UNCHANGED',
    );
    expect(
      recalculateFourSkills({ ...evidence, targetPerDay: 3 }, pool, initial)
        .reason,
    ).toBe('EVIDENCE_CHANGED');
    expect(
      recalculateFourSkills(evidence, pool, {
        policyVersion: 'old-policy',
        inputFingerprint: initial.inputFingerprint,
      }).reason,
    ).toBe('POLICY_CHANGED');
    expect(() =>
      recalculateFourSkills({ ...evidence, policyVersion: 'old-policy' }, pool),
    ).toThrow('Unsupported balance policy version.');
  });
});
