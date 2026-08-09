import {
  createAdvisoryRubric,
  createTaskVersion,
  learnerTaskProjection,
  ToeicSpeakingWritingError,
} from './toeic-speaking-writing.models';
const task = {
  id: 'sw-1',
  skill: 'SPEAKING' as const,
  taskType: 'DESCRIBE_PICTURE' as const,
  version: 'v1',
  promptKind: 'IMAGE' as const,
  responseMode: 'RECORDED_AUDIO' as const,
  instruction: 'Speak.',
  prompt: 'Describe.',
  durationSeconds: 45,
  media: [{ kind: 'IMAGE' as const, assetId: 'asset-1' }],
  publicationState: 'PUBLISHED' as const,
};
describe('TOEIC speaking/writing contracts', () => {
  it('validates and safely projects published tasks', () => {
    const value = createTaskVersion(task);
    expect(learnerTaskProjection(value)).toEqual(
      expect.objectContaining({ id: 'sw-1' }),
    );
    expect(() =>
      learnerTaskProjection({ ...value, publicationState: 'DRAFT' }),
    ).toThrow(ToeicSpeakingWritingError);
  });
  it('deep freezes returned values and rejects contradictions', () => {
    const value = createTaskVersion(task);
    expect(Object.isFrozen(value)).toBe(true);
    expect(Object.isFrozen(value.media)).toBe(true);
    expect(() => createTaskVersion({ ...task, skill: 'WRITING' })).toThrow(
      'INVALID_METADATA',
    );
  });
  it('validates advisory rubric weights and duplicate IDs', () => {
    const criterion = (id: string) => ({
      id,
      skill: 'WRITING' as const,
      label: 'Content',
      weightBasisPoints: 10000,
      minScore: 0,
      maxScore: 5,
      descriptors: [{ id: 'd1', level: '1', description: 'Bounded.' }],
    });
    expect(
      createAdvisoryRubric({
        id: 'r1',
        version: 'v1',
        skill: 'WRITING',
        criteria: [criterion('c1')],
      }).advisoryOnly,
    ).toBe(true);
    expect(() =>
      createAdvisoryRubric({
        id: 'r1',
        version: 'v1',
        skill: 'WRITING',
        criteria: [criterion('c1'), criterion('c1')],
      }),
    ).toThrow('INVALID_METADATA');
  });
});
