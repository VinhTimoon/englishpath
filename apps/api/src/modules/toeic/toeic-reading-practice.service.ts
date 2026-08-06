import { Inject, Injectable } from '@nestjs/common';
import type { ApplicationPrincipal } from '../access';
import { ToeicPart } from '../../generated/prisma/enums';
import {
  TOEIC_READING_PRACTICE_REPOSITORY,
  type ReadingQuestion,
  type ReadingSession,
  type SafeReadingQuestion,
  type ToeicReadingPracticeRepository,
} from './toeic-reading-practice.models';
import { TOEIC_ERROR_CODES, ToeicQuestionError } from './toeic-question.error';
import type {
  AnswerToeicReadingPracticeDto,
  StartToeicReadingPracticeDto,
} from './dto/toeic-reading-practice.dto';

const READING_PARTS = new Set<ToeicPart>([
  ToeicPart.PART_5,
  ToeicPart.PART_6,
  ToeicPart.PART_7,
]);

type ParsedOption = Readonly<{ id: string; text: string }>;
type OptionRecord = Readonly<{ id: unknown; text: unknown }>;

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

function parseOptions(value: unknown): readonly ParsedOption[] {
  if (!Array.isArray(value) || value.length < 2 || value.length > 6) {
    throw new ToeicQuestionError(TOEIC_ERROR_CODES.INVALID_CONTENT);
  }
  const options: ParsedOption[] = [];
  const seen = new Set<string>();
  for (const item of value as readonly unknown[]) {
    const option = item as OptionRecord;
    if (
      typeof item !== 'object' ||
      item === null ||
      typeof option.id !== 'string' ||
      typeof option.text !== 'string' ||
      !/^[A-F]$/.test(option.id) ||
      !option.text.trim() ||
      seen.has(option.id)
    ) {
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.INVALID_CONTENT);
    }
    seen.add(option.id);
    options.push({ id: option.id, text: option.text.trim() });
  }
  return options;
}

function safeQuestion(question: ReadingQuestion): SafeReadingQuestion {
  return {
    id: question.id,
    questionId: question.questionId,
    prompt: question.prompt,
    options: parseOptions(question.options),
    part: question.part,
    questionType: question.questionType,
    difficulty: question.difficulty,
    topic: question.topic,
    stimulusGroup: question.stimulusGroup,
    mediaReference: question.mediaReference,
    explanation: question.explanation,
  };
}

function safeSession(session: ReadingSession) {
  return {
    sessionId: session.id,
    status: session.status,
    total: session.total,
    answered: session.answers.length,
    startedAt: session.startedAt,
    submittedAt: session.submittedAt,
    readingPart: session.readingPart,
    ...(session.difficulty ? { difficulty: session.difficulty } : {}),
    ...(session.topic ? { topic: session.topic } : {}),
    ...(session.status === 'SUBMITTED' ? { score: session.score } : {}),
  };
}

@Injectable()
export class ToeicReadingPracticeService {
  constructor(
    @Inject(TOEIC_READING_PRACTICE_REPOSITORY)
    private readonly repository: ToeicReadingPracticeRepository,
  ) {}

  async start(
    principal: ApplicationPrincipal,
    input: StartToeicReadingPracticeDto,
  ) {
    if (input.readingPart && !READING_PARTS.has(input.readingPart)) {
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.INVALID_CONTENT);
    }

    const difficulty = input.difficulty ?? null;
    const topic = input.topic || null;

    try {
      const existing = await this.repository.findByClient(
        principal.applicationUserId,
        input.clientSessionId,
      );
      if (existing) {
        if (
          existing.total !== input.questionCount ||
          existing.readingPart !== (input.readingPart ?? null) ||
          (existing.difficulty ?? null) !== difficulty ||
          (existing.topic ?? null) !== topic
        ) {
          throw new ToeicQuestionError(TOEIC_ERROR_CODES.CONFLICT);
        }
        return {
          session: safeSession(existing),
          questions: await this.questionsForSession(existing),
          replayed: true,
        };
      }

      const candidates = await this.repository.eligibleQuestions(
        new Date(),
        input.readingPart,
        input.difficulty,
        topic ?? undefined,
      );
      if (candidates.length < input.questionCount) {
        throw new ToeicQuestionError(TOEIC_ERROR_CODES.NOT_FOUND);
      }
      const selected = candidates.slice(0, input.questionCount);
      selected.forEach(safeQuestion);
      const created = await this.repository.createSession({
        userId: principal.applicationUserId,
        clientSessionId: input.clientSessionId,
        readingPart: input.readingPart ?? null,
        difficulty,
        topic,
        questionIds: selected.map((question) => question.id),
        total: selected.length,
      });
      return {
        session: safeSession(created),
        questions: selected.map(safeQuestion),
        replayed: false,
      };
    } catch (error) {
      if (error instanceof ToeicQuestionError) throw error;
      if (isUniqueConstraintError(error)) {
        try {
          const replay = await this.repository.findByClient(
            principal.applicationUserId,
            input.clientSessionId,
          );
          if (
            replay &&
            replay.total === input.questionCount &&
            replay.readingPart === (input.readingPart ?? null) &&
            (replay.difficulty ?? null) === difficulty &&
            (replay.topic ?? null) === topic
          ) {
            return {
              session: safeSession(replay),
              questions: await this.questionsForSession(replay),
              replayed: true,
            };
          }
        } catch {
          throw new ToeicQuestionError(TOEIC_ERROR_CODES.REPOSITORY_FAILURE);
        }
        throw new ToeicQuestionError(TOEIC_ERROR_CODES.CONFLICT);
      }
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.REPOSITORY_FAILURE);
    }
  }

  async answer(
    principal: ApplicationPrincipal,
    sessionId: string,
    input: AnswerToeicReadingPracticeDto,
  ) {
    try {
      const session = await this.repository.findSession(
        sessionId,
        principal.applicationUserId,
      );
      if (
        !session ||
        session.status !== 'ACTIVE' ||
        !session.questionIds.includes(input.questionId)
      ) {
        throw new ToeicQuestionError(TOEIC_ERROR_CODES.NOT_FOUND);
      }

      const privateQuestions = await this.repository.privateQuestionsByIds(
        [input.questionId],
        new Date(),
      );
      const question = privateQuestions[0];
      if (!question) throw new ToeicQuestionError(TOEIC_ERROR_CODES.NOT_FOUND);
      const options = parseOptions(question.options);
      if (!options.some((option) => option.id === input.selectedOption)) {
        throw new ToeicQuestionError(TOEIC_ERROR_CODES.INVALID_CONTENT);
      }
      if (!options.some((option) => option.id === question.correctAnswer)) {
        throw new ToeicQuestionError(TOEIC_ERROR_CODES.INVALID_CONTENT);
      }

      const prior = session.answers.find(
        (answer) => answer.questionId === input.questionId,
      );
      if (prior) {
        if (prior.selectedOption !== input.selectedOption) {
          throw new ToeicQuestionError(TOEIC_ERROR_CODES.CONFLICT);
        }
        return {
          accepted: true,
          replayed: true,
          questionId: input.questionId,
          answered: session.answers.length,
          total: session.total,
        };
      }

      const inserted = await this.repository.createAnswer({
        sessionId,
        questionId: input.questionId,
        selectedOption: input.selectedOption,
        isCorrect: input.selectedOption === question.correctAnswer,
      });
      if (!inserted) throw new ToeicQuestionError(TOEIC_ERROR_CODES.CONFLICT);
      return {
        accepted: true,
        replayed: false,
        questionId: input.questionId,
        answered: session.answers.length + 1,
        total: session.total,
      };
    } catch (error) {
      if (error instanceof ToeicQuestionError) throw error;
      if (isUniqueConstraintError(error)) {
        try {
          const current = await this.repository.findSession(
            sessionId,
            principal.applicationUserId,
          );
          const prior = current?.answers.find(
            (answer) => answer.questionId === input.questionId,
          );
          if (current && prior?.selectedOption === input.selectedOption) {
            return {
              accepted: true,
              replayed: true,
              questionId: input.questionId,
              answered: current.answers.length,
              total: current.total,
            };
          }
        } catch {
          throw new ToeicQuestionError(TOEIC_ERROR_CODES.REPOSITORY_FAILURE);
        }
        throw new ToeicQuestionError(TOEIC_ERROR_CODES.CONFLICT);
      }
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.REPOSITORY_FAILURE);
    }
  }

  async submit(principal: ApplicationPrincipal, sessionId: string) {
    try {
      const session = await this.repository.findGradingSession(
        sessionId,
        principal.applicationUserId,
      );
      if (!session) throw new ToeicQuestionError(TOEIC_ERROR_CODES.NOT_FOUND);
      if (session.status === 'SUBMITTED') return safeSession(session);

      const answeredIds = new Set(
        session.answers.map((answer) => answer.questionId),
      );
      const complete =
        session.answers.length === session.total &&
        answeredIds.size === session.total &&
        session.questionIds.every((questionId) => answeredIds.has(questionId));
      if (!complete) throw new ToeicQuestionError(TOEIC_ERROR_CODES.INCOMPLETE);

      const score = session.answers.filter((answer) => answer.isCorrect).length;
      const won = await this.repository.submitSession(
        sessionId,
        principal.applicationUserId,
        score,
        new Date(),
      );
      const current = await this.repository.findSession(
        sessionId,
        principal.applicationUserId,
      );
      if (!current)
        throw new ToeicQuestionError(TOEIC_ERROR_CODES.REPOSITORY_FAILURE);
      if (!won && current.status !== 'SUBMITTED') {
        throw new ToeicQuestionError(TOEIC_ERROR_CODES.CONFLICT);
      }
      return safeSession(current);
    } catch (error) {
      if (error instanceof ToeicQuestionError) throw error;
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.REPOSITORY_FAILURE);
    }
  }

  async result(principal: ApplicationPrincipal, sessionId: string) {
    try {
      const session = await this.repository.findSession(
        sessionId,
        principal.applicationUserId,
      );
      if (!session) throw new ToeicQuestionError(TOEIC_ERROR_CODES.NOT_FOUND);
      return safeSession(session);
    } catch (error) {
      if (error instanceof ToeicQuestionError) throw error;
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.REPOSITORY_FAILURE);
    }
  }

  private async questionsForSession(session: ReadingSession) {
    const questions = await this.repository.snapshotQuestionsByIds(
      session.questionIds,
      new Date(),
    );
    if (questions.length !== session.questionIds.length) {
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.NOT_FOUND);
    }
    const byId = new Map(questions.map((question) => [question.id, question]));
    return session.questionIds.map((id) => safeQuestion(byId.get(id)!));
  }
}
