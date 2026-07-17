import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ApplicationPrincipal } from '../access';
import { AnswerPracticeDto } from './dto/practice.dto';
import { PRACTICE_QUESTIONS } from './practice.fixture';
import { PRACTICE_REPOSITORY } from './practice.models';
import type { PracticeRepository } from './practice.ports';

@Injectable()
export class PracticeService {
  constructor(
    @Inject(PRACTICE_REPOSITORY)
    private readonly repository: PracticeRepository,
  ) {}

  async start(principal: ApplicationPrincipal, clientSessionId: string) {
    const session = await this.repository.start(
      principal.applicationUserId,
      clientSessionId,
      PRACTICE_QUESTIONS.map(({ id }) => id),
    );
    return {
      session,
      questions: PRACTICE_QUESTIONS.map(({ id, prompt, options }) => ({
        id,
        prompt,
        options,
      })),
    };
  }

  async answer(
    principal: ApplicationPrincipal,
    sessionId: string,
    input: AnswerPracticeDto,
  ) {
    const question = PRACTICE_QUESTIONS.find(
      ({ id }) => id === input.questionId,
    );
    if (
      !question ||
      !question.options.some(({ id }) => id === input.selectedOption)
    )
      throw new BadRequestException();
    const isCorrect = input.selectedOption === question.correctOption;
    const persisted = await this.repository.answer(
      principal.applicationUserId,
      sessionId,
      {
        ...input,
        isCorrect,
        prompt: question.prompt,
        correctOption: question.correctOption,
        explanation: question.explanation,
      },
    );
    if (!persisted) throw new NotFoundException();
    return {
      session: persisted.session,
      feedback: {
        questionId: question.id,
        isCorrect: persisted.isCorrect,
        correctOption: question.correctOption,
        explanation: question.explanation,
      },
    };
  }

  async submit(principal: ApplicationPrincipal, sessionId: string) {
    const session = await this.repository.submit(
      principal.applicationUserId,
      sessionId,
    );
    if (!session) throw new BadRequestException();
    return session;
  }

  async result(principal: ApplicationPrincipal, sessionId: string) {
    const session = await this.repository.result(
      principal.applicationUserId,
      sessionId,
    );
    if (!session) throw new NotFoundException();
    return session;
  }

  summary(principal: ApplicationPrincipal) {
    return this.repository.summary(principal.applicationUserId);
  }
}
