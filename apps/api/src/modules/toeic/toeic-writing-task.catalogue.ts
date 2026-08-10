import {
  createTaskVersion,
  type TaskVersion,
} from './toeic-speaking-writing.models';
import type { ToeicWritingTaskCatalogue } from './toeic-writing-submission.models';

const REVIEWED_ENGLISHPATH_WRITING_TASKS: readonly TaskVersion[] = [
  createTaskVersion({
    id: 'ep-writing-sentence-001',
    skill: 'WRITING',
    taskType: 'SENTENCE_BASED',
    version: 'v1',
    promptKind: 'TEXT',
    responseMode: 'TEXT',
    instruction: 'Write a clear response using complete sentences.',
    prompt: 'Describe one habit that helps you study English every day.',
    minWords: 5,
    maxWords: 40,
    publicationState: 'PUBLISHED',
  }),
];

export class EnglishPathWritingTaskCatalogue implements ToeicWritingTaskCatalogue {
  findPublished(taskId: string) {
    return Promise.resolve(
      REVIEWED_ENGLISHPATH_WRITING_TASKS.find((task) => task.id === taskId) ??
        null,
    );
  }
}
