export const TOEIC_QUESTION_REPOSITORY = Symbol('TOEIC_QUESTION_REPOSITORY');
export type SafeToeicQuestion = {
  id: string;
  questionId: string;
  version: number;
  part: string;
  questionType: string;
  difficulty: string;
  topic: string | null;
  stimulusGroup: string | null;
  prompt: string;
  options: unknown;
  mediaReference: string | null;
  explanation: string | null;
};
export interface ToeicQuestionRepository {
  list(input: any): Promise<{ items: SafeToeicQuestion[]; totalItems: number }>;
  find(id: string, now: Date): Promise<SafeToeicQuestion | null>;
}
