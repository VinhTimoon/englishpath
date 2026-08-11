import { adaptRoadmap } from './adaptive-roadmap.policy';
import type { RoadmapView } from './roadmap.models';

const roadmap = (items: RoadmapView['items']) => ({
  id: 'r',
  version: 1,
  status: 'ACTIVE' as const,
  previousRoadmapId: null,
  generatedAt: new Date(0),
  goal: 'ENGLISH_FOUNDATION' as const,
  level: 'BEGINNER' as const,
  durationDays: 30 as const,
  dailyMinutes: 20,
  items,
});
const item = (
  sequence: number,
  skill: 'VOCABULARY' | 'LISTENING' | 'READING',
  status: 'PENDING' | 'COMPLETED' = 'PENDING',
) => ({
  id: `${sequence}`,
  dayNumber: 1,
  sequence,
  phase: 'FOUNDATION' as const,
  skill,
  taskType:
    skill === 'READING' || skill === 'LISTENING'
      ? skill
      : ('VOCABULARY' as const),
  title: skill,
  minutes: 10,
  status,
  completedAt: status === 'COMPLETED' ? new Date(1) : null,
});

describe('adaptive roadmap policy', () => {
  it('is deterministic, bounded, and preserves protected slots/status', () => {
    const current = roadmap([
      item(1, 'VOCABULARY', 'COMPLETED'),
      item(2, 'LISTENING'),
      item(3, 'READING'),
    ]);
    const evidence = {
      policyVersion: 'adaptive-roadmap-v1' as const,
      domains: [
        { domain: 'GENERAL' as const, state: 'empty' as const, entryCount: 0 },
        {
          domain: 'LISTENING' as const,
          state: 'empty' as const,
          entryCount: 0,
        },
        {
          domain: 'READING' as const,
          state: 'available' as const,
          entryCount: 2,
        },
        {
          domain: 'SPEAKING' as const,
          state: 'unavailable' as const,
          entryCount: 0,
        },
        {
          domain: 'WRITING' as const,
          state: 'unavailable' as const,
          entryCount: 0,
        },
      ],
    };
    const result = adaptRoadmap(current, evidence);
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      sequence: 1,
      status: 'COMPLETED',
      skill: 'VOCABULARY',
    });
    expect(result[0]?.completedAt).toEqual(new Date(1));
    expect(result.map((x) => x.skill)).toEqual([
      'VOCABULARY',
      'READING',
      'LISTENING',
    ]);
    expect(adaptRoadmap(current, evidence)).toEqual(result);
  });

  it('fails closed for unsupported or unavailable evidence', () => {
    const current = roadmap([item(1, 'VOCABULARY')]);
    expect(adaptRoadmap(current, null)).toEqual([
      expect.objectContaining({ skill: 'VOCABULARY' }),
    ]);
    expect(adaptRoadmap(current, undefined)).toEqual([
      expect.objectContaining({ skill: 'VOCABULARY' }),
    ]);
    expect(
      adaptRoadmap(current, { policyVersion: 'other' as never, domains: [] }),
    ).toEqual([expect.objectContaining({ skill: 'VOCABULARY' })]);
    expect(
      adaptRoadmap(current, {
        policyVersion: 'adaptive-roadmap-v1',
        domains: [
          { domain: 'GENERAL', state: 'empty', entryCount: 0 },
          { domain: 'LISTENING', state: 'empty', entryCount: 0 },
          { domain: 'READING', state: 'unavailable', entryCount: 0 },
          { domain: 'SPEAKING', state: 'unavailable', entryCount: 0 },
          { domain: 'WRITING', state: 'unavailable', entryCount: 0 },
        ],
      }),
    ).toEqual([expect.objectContaining({ skill: 'VOCABULARY' })]);
    expect(
      adaptRoadmap(current, {
        policyVersion: 'adaptive-roadmap-v1',
        domains: [
          { domain: 'GENERAL', state: 'empty', entryCount: 1 },
          { domain: 'LISTENING', state: 'empty', entryCount: 0 },
          { domain: 'READING', state: 'available', entryCount: 0 },
          { domain: 'SPEAKING', state: 'unavailable', entryCount: 0 },
          { domain: 'WRITING', state: 'unavailable', entryCount: 0 },
        ],
      }),
    ).toEqual([expect.objectContaining({ skill: 'VOCABULARY' })]);
    expect(
      adaptRoadmap(current, {
        policyVersion: 'adaptive-roadmap-v1',
        domains: [
          { domain: 'GENERAL', state: 'empty', entryCount: 0 },
          { domain: 'LISTENING', state: 'empty', entryCount: 0 },
          { domain: 'READING', state: 'empty', entryCount: 0 },
          { domain: 'SPEAKING', state: 'available', entryCount: 1 },
          { domain: 'WRITING', state: 'unavailable', entryCount: 0 },
        ],
      }),
    ).toEqual([expect.objectContaining({ skill: 'VOCABULARY' })]);
  });
});
