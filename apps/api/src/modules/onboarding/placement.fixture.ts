import type { LearningSkill } from './onboarding.models';

export type PlacementQuestion = Readonly<{
  id: string;
  skill: LearningSkill;
  prompt: string;
  options: readonly Readonly<{ id: string; label: string }>[];
}>;

export const PLACEMENT_QUESTIONS: readonly PlacementQuestion[] = [
  {
    id: 'v1',
    skill: 'VOCABULARY',
    prompt: 'Choose the closest meaning of “reliable”.',
    options: [
      { id: 'a', label: 'đáng tin cậy' },
      { id: 'b', label: 'đắt tiền' },
      { id: 'c', label: 'ồn ào' },
    ],
  },
  {
    id: 'v2',
    skill: 'VOCABULARY',
    prompt: 'The meeting was ___ until Friday.',
    options: [
      { id: 'a', label: 'borrowed' },
      { id: 'b', label: 'postponed' },
      { id: 'c', label: 'painted' },
    ],
  },
  {
    id: 'v3',
    skill: 'VOCABULARY',
    prompt: '“Deadline” means…',
    options: [
      { id: 'a', label: 'hạn chót' },
      { id: 'b', label: 'giờ nghỉ' },
      { id: 'c', label: 'biên lai' },
    ],
  },
  {
    id: 'g1',
    skill: 'GRAMMAR',
    prompt: 'She ___ English every evening.',
    options: [
      { id: 'a', label: 'studies' },
      { id: 'b', label: 'study' },
      { id: 'c', label: 'studying' },
    ],
  },
  {
    id: 'g2',
    skill: 'GRAMMAR',
    prompt: 'If I had more time, I ___ more.',
    options: [
      { id: 'a', label: 'practise' },
      { id: 'b', label: 'will practised' },
      { id: 'c', label: 'would practise' },
    ],
  },
  {
    id: 'g3',
    skill: 'GRAMMAR',
    prompt: 'The report ___ yesterday.',
    options: [
      { id: 'a', label: 'was completed' },
      { id: 'b', label: 'completes' },
      { id: 'c', label: 'is complete by' },
    ],
  },
  {
    id: 'r1',
    skill: 'READING',
    prompt: '“Please submit before noon.” What is required?',
    options: [
      { id: 'a', label: 'Send it before 12:00' },
      { id: 'b', label: 'Meet after lunch' },
      { id: 'c', label: 'Cancel the task' },
    ],
  },
  {
    id: 'r2',
    skill: 'READING',
    prompt: '“The store is closed for renovation.” Why is it closed?',
    options: [
      { id: 'a', label: 'It moved abroad' },
      { id: 'b', label: 'It is being improved' },
      { id: 'c', label: 'It sold everything' },
    ],
  },
  {
    id: 'r3',
    skill: 'READING',
    prompt: '“Despite the rain, the event continued.” What happened?',
    options: [
      { id: 'a', label: 'The event went ahead' },
      { id: 'b', label: 'The event was delayed' },
      { id: 'c', label: 'The rain stopped early' },
    ],
  },
  {
    id: 'r4',
    skill: 'READING',
    prompt:
      '“Candidates must have at least two years of experience.” Who qualifies?',
    options: [
      { id: 'a', label: 'A new graduate with none' },
      { id: 'b', label: 'Anyone who applies' },
      { id: 'c', label: 'Someone with three years’ experience' },
    ],
  },
];

export const PLACEMENT_ANSWER_KEY: Readonly<Record<string, string>> =
  Object.freeze({
    v1: 'a',
    v2: 'b',
    v3: 'a',
    g1: 'a',
    g2: 'c',
    g3: 'a',
    r1: 'a',
    r2: 'b',
    r3: 'a',
    r4: 'c',
  });
