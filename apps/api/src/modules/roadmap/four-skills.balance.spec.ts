import {
  allocateFourSkills,
  FOUR_SKILLS,
  learnerSafeFourSkillsProjection,
  projectRoadmapFourSkills,
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
        completionState: 'UNAVAILABLE',
        availability: 'UNAVAILABLE',
      }),
    );
  });

  it('projects four canonical skills from server-owned roadmap items', () => {
    const items = [
      {
        id: 'reading-1',
        dayNumber: 1,
        sequence: 1,
        phase: 'FOUNDATION' as const,
        skill: 'READING' as const,
        taskType: 'READING' as const,
        title: 'Reading',
        minutes: 10,
        status: 'COMPLETED' as const,
        completedAt: new Date(),
      },
      {
        id: 'reading-2',
        dayNumber: 2,
        sequence: 1,
        phase: 'FOUNDATION' as const,
        skill: 'READING' as const,
        taskType: 'READING' as const,
        title: 'Reading',
        minutes: 10,
        status: 'PENDING' as const,
        completedAt: null,
      },
      {
        id: 'listening-1',
        dayNumber: 1,
        sequence: 2,
        phase: 'FOUNDATION' as const,
        skill: 'LISTENING' as const,
        taskType: 'LISTENING' as const,
        title: 'Listening',
        minutes: 10,
        status: 'PENDING' as const,
        completedAt: null,
      },
    ];
    const projection = projectRoadmapFourSkills(items);
    expect(projection.map(({ skill }) => skill)).toEqual(FOUR_SKILLS);
    expect(projection[0]).toMatchObject({
      target: 2,
      reference: 'reading-1',
      completionState: 'PENDING',
      availability: 'AVAILABLE',
    });
    expect(projection[2]).toMatchObject({
      target: null,
      reference: null,
      completionState: 'UNAVAILABLE',
      availability: 'UNAVAILABLE',
    });
    expect(JSON.stringify(projection)).not.toMatch(
      /provider|rubric|submission|credential|answer/i,
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
