import type { CompletionRecord, SentenceRecord } from './daily-sentence.models';
export interface DailySentenceRepository {
  profileTimezone(userId: string): Promise<string | null>;
  eligibleSentences(): Promise<SentenceRecord[]>;
  completion(userId: string, localDate: Date): Promise<CompletionRecord | null>;
  complete(
    userId: string,
    sentenceId: string,
    localDate: Date,
    answer: string,
    isCorrect: boolean,
    feedback: string,
  ): Promise<CompletionRecord>;
}
