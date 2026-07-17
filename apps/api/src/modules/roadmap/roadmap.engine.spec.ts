import type { RoadmapSeed } from './roadmap.models';
import { buildRoadmap } from './roadmap.engine';

const base: RoadmapSeed = {
  goal: 'ENGLISH_FOUNDATION',
  level: 'BEGINNER',
  durationDays: 30,
  dailyMinutes: 20,
  prioritySkills: ['VOCABULARY'],
};

describe('roadmap rule engine', () => {
  it.each([30, 60, 90, 120] as const)(
    'caps short study days and includes all phases for %s days',
    (durationDays) => {
      const items = buildRoadmap({ ...base, durationDays });
      expect(items).toHaveLength(durationDays * 3);
      expect(new Set(items.map(({ phase }) => phase))).toEqual(
        new Set([
          'FOUNDATION',
          'SKILL_BUILDING',
          'PRACTICE_CORRECTION',
          'SIMULATION_REVIEW',
        ]),
      );
      for (let day = 1; day <= durationDays; day += 1) {
        expect(items.filter(({ dayNumber }) => dayNumber === day)).toHaveLength(
          3,
        );
      }
    },
  );

  it('uses five balanced tasks for a 60-minute study day', () => {
    const items = buildRoadmap({ ...base, dailyMinutes: 60 });
    expect(items.filter(({ dayNumber }) => dayNumber === 1)).toHaveLength(5);
  });

  it('covers TOEIC Parts 1-7 in the first week', () => {
    const items = buildRoadmap({
      ...base,
      goal: 'TOEIC_LISTENING_READING',
    });
    const firstWeek = items.filter(({ dayNumber }) => dayNumber <= 7);
    for (let part = 1; part <= 7; part += 1) {
      expect(
        firstWeek.some(({ title }) => title === `TOEIC Part ${part}`),
      ).toBe(true);
    }
  });

  it('keeps speaking and daily sentences in every communication day', () => {
    const items = buildRoadmap({ ...base, goal: 'DAILY_COMMUNICATION' });
    for (let day = 1; day <= 30; day += 1) {
      const daily = items.filter(({ dayNumber }) => dayNumber === day);
      expect(daily.some(({ taskType }) => taskType === 'SPEAKING')).toBe(true);
      expect(daily.some(({ taskType }) => taskType === 'DAILY_SENTENCE')).toBe(
        true,
      );
    }
  });
});
