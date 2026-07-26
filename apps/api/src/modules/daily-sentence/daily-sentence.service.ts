import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ApplicationPrincipal } from '../access';
import {
  DAILY_SENTENCE_REPOSITORY,
  type DailySentenceView,
  type SentenceRecord,
} from './daily-sentence.models';
import type { DailySentenceRepository } from './daily-sentence.ports';

const FALLBACK_TIMEZONE = 'Asia/Ho_Chi_Minh';
function validTimezone(value: string | null) {
  if (!value) return FALLBACK_TIMEZONE;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return value;
  } catch {
    return FALLBACK_TIMEZONE;
  }
}
function localDay(now: Date, timezone: string | null) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: validTimezone(timezone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return {
    key: `${get('year')}-${get('month')}-${get('day')}`,
    date: new Date(
      Date.UTC(
        Number(get('year')),
        Number(get('month')) - 1,
        Number(get('day')),
      ),
    ),
  };
}
function pick(sentences: SentenceRecord[], key: string) {
  if (!sentences.length) return null;
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return sentences[hash % sentences.length];
}
function normalize(answer: string) {
  return answer
    .trim()
    .replace(/[.!?]+$/g, '')
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('en-US');
}

@Injectable()
export class DailySentenceService {
  constructor(
    @Inject(DAILY_SENTENCE_REPOSITORY)
    private readonly repository: DailySentenceRepository,
  ) {}
  private async context(userId: string, now = new Date()) {
    const day = localDay(now, await this.repository.profileTimezone(userId));
    const sentence = pick(
      await this.repository.eligibleSentences(now),
      day.key,
    );
    return { ...day, sentence };
  }
  async today(principal: ApplicationPrincipal): Promise<DailySentenceView> {
    const day = localDay(
      new Date(),
      await this.repository.profileTimezone(principal.applicationUserId),
    );
    const completion = await this.repository.completion(
      principal.applicationUserId,
      day.date,
    );
    if (completion)
      return {
        localDate: day.key,
        sentence: {
          id: completion.sentence.id,
          prompt: completion.sentence.prompt,
        },
        completed: true,
        feedback: {
          isCorrect: completion.isCorrect,
          message: completion.feedback,
          completedAt: completion.completedAt.toISOString(),
        },
      };
    const context = await this.context(principal.applicationUserId);
    if (!context.sentence)
      return { localDate: context.key, sentence: null, completed: false };
    return {
      localDate: context.key,
      sentence: {
        id: context.sentence.id,
        prompt: context.sentence.prompt,
      },
      completed: false,
    };
  }
  async submit(
    principal: ApplicationPrincipal,
    sentenceId: string,
    answer: string,
  ): Promise<DailySentenceView> {
    const now = new Date();
    const day = localDay(
      now,
      await this.repository.profileTimezone(principal.applicationUserId),
    );
    const existing = await this.repository.completion(
      principal.applicationUserId,
      day.date,
    );
    if (existing)
      return {
        localDate: day.key,
        sentence: {
          id: existing.sentence.id,
          prompt: existing.sentence.prompt,
        },
        completed: true,
        feedback: {
          isCorrect: existing.isCorrect,
          message: existing.feedback,
          completedAt: existing.completedAt.toISOString(),
        },
      };
    const sentence = pick(
      await this.repository.eligibleSentences(now),
      day.key,
    );
    if (!sentence) throw new NotFoundException();
    if (sentence.id !== sentenceId) throw new BadRequestException();
    const isCorrect = normalize(answer) === normalize(sentence.expectedAnswer);
    const feedback = isCorrect
      ? 'Correct — your sentence matches today’s answer.'
      : 'Not quite yet. Compare your sentence with the prompt and try the phrase again tomorrow.';
    const completion = await this.repository.complete(
      principal.applicationUserId,
      sentenceId,
      day.date,
      answer.trim(),
      isCorrect,
      feedback,
    );
    return {
      localDate: day.key,
      sentence: {
        id: completion.sentence.id,
        prompt: completion.sentence.prompt,
      },
      completed: true,
      feedback: {
        isCorrect: completion.isCorrect,
        message: completion.feedback,
        completedAt: completion.completedAt.toISOString(),
      },
    };
  }
}
