import { Inject, Injectable } from '@nestjs/common';
import type { ApplicationPrincipal } from '../access';
import { AI_FEEDBACK_PROMPT_VERSION } from '../ai-gateway/ai-feedback.models';
import { AiFeedbackGatewayService } from '../ai-gateway/ai-feedback.service';
import { TOEIC_ERROR_CODES, ToeicQuestionError } from './toeic-question.error';
import {
  TOEIC_SPEAKING_SUBMISSION_REPOSITORY,
  type ToeicSpeakingSubmissionRepository,
} from './toeic-speaking-submission.models';
import { ToeicRecordingService } from './toeic-recording.service';

@Injectable()
export class ToeicSpeakingFeedbackService {
  constructor(
    @Inject(TOEIC_SPEAKING_SUBMISSION_REPOSITORY)
    private readonly repository: ToeicSpeakingSubmissionRepository,
    private readonly recordings: ToeicRecordingService,
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

    const recording = await this.recordings.getForSubmission(
      principal,
      session.submission.id,
    );
    if (recording.recording.state !== 'AVAILABLE') {
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.RECORDING_UNAVAILABLE);
    }

    // The approved local/no-op gateway has no speech-to-text or audio-capable
    // provider adapter. Record the bounded attempt and fail closed rather than
    // manufacturing feedback from metadata or an opaque recording reference.
    return this.gateway.requestUnavailable(
      principal,
      {
        feature: 'SPEAKING',
        skill: 'SPEAKING',
        promptVersion: AI_FEEDBACK_PROMPT_VERSION,
        taskId: session.taskId,
        inputReference: recording.recording.recordingId,
      },
      idempotencyKey,
      correlationId,
    );
  }
}
