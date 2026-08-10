import { Inject, Injectable } from '@nestjs/common';
import type { ApplicationPrincipal } from '../access';
import { AI_FEEDBACK_PROMPT_VERSION } from '../ai-gateway/ai-feedback.models';
import { AiFeedbackGatewayService } from '../ai-gateway/ai-feedback.service';
import { TOEIC_ERROR_CODES, ToeicQuestionError } from './toeic-question.error';
import {
  TOEIC_WRITING_SUBMISSION_REPOSITORY,
  type ToeicWritingSubmissionRepository,
} from './toeic-writing-submission.models';

@Injectable()
export class ToeicWritingFeedbackService {
  constructor(
    @Inject(TOEIC_WRITING_SUBMISSION_REPOSITORY)
    private readonly repository: ToeicWritingSubmissionRepository,
    private readonly gateway: AiFeedbackGatewayService,
  ) {}

  async request(
    principal: ApplicationPrincipal,
    sessionId: string,
    idempotencyKey: string | undefined,
    correlationId: string,
  ) {
    const session = await this.repository.findSession(
      principal.applicationUserId,
      sessionId,
    );
    if (!session) throw new ToeicQuestionError(TOEIC_ERROR_CODES.NOT_FOUND);
    if (session.status !== 'FINALIZED' || !session.submission) {
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.INCOMPLETE);
    }

    return this.gateway.request(
      principal,
      {
        feature: 'WRITING',
        skill: 'WRITING',
        promptVersion: AI_FEEDBACK_PROMPT_VERSION,
        taskId: session.taskId,
        inputText: session.submission.submittedText,
      },
      idempotencyKey,
      correlationId,
    );
  }
}
