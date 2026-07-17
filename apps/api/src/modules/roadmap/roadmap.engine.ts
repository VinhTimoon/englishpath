import type { LearningSkill } from '../onboarding/onboarding.models';
import type {
  RoadmapItemDraft,
  RoadmapPhase,
  RoadmapSeed,
  RoadmapTaskType,
} from './roadmap.models';

type TaskTemplate = Readonly<{
  skill: LearningSkill;
  taskType: RoadmapTaskType;
  title: string;
}>;

const generalTasks: readonly TaskTemplate[] = [
  { skill: 'VOCABULARY', taskType: 'VOCABULARY', title: 'Từ vựng theo chủ đề' },
  { skill: 'GRAMMAR', taskType: 'GRAMMAR', title: 'Ngữ pháp trong ngữ cảnh' },
  { skill: 'LISTENING', taskType: 'LISTENING', title: 'Nghe hiểu ngắn' },
  { skill: 'READING', taskType: 'READING', title: 'Đọc hiểu thực tế' },
  { skill: 'WRITING', taskType: 'WRITING', title: 'Viết câu ứng dụng' },
];

function phaseFor(day: number, duration: number): RoadmapPhase {
  const progress = day / duration;
  if (progress <= 0.2) return 'FOUNDATION';
  if (progress <= 0.5) return 'SKILL_BUILDING';
  if (progress <= 0.8) return 'PRACTICE_CORRECTION';
  return 'SIMULATION_REVIEW';
}

function taskCount(minutes: number) {
  if (minutes < 30) return 3;
  if (minutes >= 60) return 5;
  return 4;
}

function toeicTask(index: number): TaskTemplate {
  const part = (index % 7) + 1;
  const skill: LearningSkill = part <= 4 ? 'LISTENING' : 'READING';
  return { skill, taskType: 'TOEIC_PART', title: `TOEIC Part ${part}` };
}

function templatesFor(seed: RoadmapSeed, day: number, count: number) {
  const tasks: TaskTemplate[] = [];
  if (seed.goal === 'DAILY_COMMUNICATION') {
    tasks.push(
      {
        skill: 'SPEAKING',
        taskType: 'SPEAKING',
        title: 'Speaking room theo tình huống',
      },
      {
        skill: 'VOCABULARY',
        taskType: 'DAILY_SENTENCE',
        title: 'Câu tiếng Anh hằng ngày',
      },
    );
  }
  if (
    seed.goal === 'TOEIC_LISTENING_READING' ||
    seed.goal === 'TOEIC_FOUR_SKILLS'
  ) {
    tasks.push(toeicTask(day - 1));
  }
  for (const skill of seed.prioritySkills) {
    const match = generalTasks.find((task) => task.skill === skill);
    if (match && !tasks.some((task) => task.skill === skill)) tasks.push(match);
  }
  let cursor = day - 1;
  while (tasks.length < count) {
    const task = generalTasks[cursor % generalTasks.length];
    tasks.push(task);
    cursor += 1;
  }
  return tasks.slice(0, count);
}

export function buildRoadmap(seed: RoadmapSeed): readonly RoadmapItemDraft[] {
  const count = taskCount(seed.dailyMinutes);
  const minutes = Math.max(1, Math.floor(seed.dailyMinutes / count));
  return Array.from({ length: seed.durationDays }, (_, dayIndex) => {
    const dayNumber = dayIndex + 1;
    const phase = phaseFor(dayNumber, seed.durationDays);
    return templatesFor(seed, dayNumber, count).map((task, index) => ({
      ...task,
      dayNumber,
      sequence: index + 1,
      phase,
      minutes,
    }));
  }).flat();
}
