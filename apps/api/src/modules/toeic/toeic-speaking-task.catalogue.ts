import {
  createTaskVersion,
  type TaskVersion,
} from './toeic-speaking-writing.models';
import type { ToeicSpeakingTaskCatalogue } from './toeic-speaking-submission.models';

const REVIEWED_ENGLISHPATH_SPEAKING_TASKS: readonly TaskVersion[] = [
  createTaskVersion({
    id: 'ep-speaking-read-aloud-001',
    skill: 'SPEAKING',
    taskType: 'READ_ALOUD',
    version: 'v1',
    promptKind: 'TEXT',
    responseMode: 'RECORDED_AUDIO',
    instruction: 'Read the sentence aloud clearly and naturally.',
    prompt: 'The EnglishPath library opens a new practice room every morning.',
    durationSeconds: 45,
    publicationState: 'PUBLISHED',
  }),
];

export class EnglishPathSpeakingTaskCatalogue implements ToeicSpeakingTaskCatalogue {
  findPublished(taskId: string) {
    return Promise.resolve(
      REVIEWED_ENGLISHPATH_SPEAKING_TASKS.find((task) => task.id === taskId) ??
        null,
    );
  }
}
