import { Inject, Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import type { ApplicationPrincipal } from '../access';
import { TOEIC_ERROR_CODES, ToeicQuestionError } from './toeic-question.error';
import type { SpeakingSessionRecord } from './toeic-speaking-submission.models';
import {
  canPlayback,
  isToeicRecordingContentType,
  playbackExpiresAt,
  TOEIC_RECORDING_MAX_DURATION_SECONDS,
  TOEIC_RECORDING_MAX_SIZE_BYTES,
  type ToeicRecordingContentType,
} from './toeic-recording.policy';
import {
  TOEIC_SPEAKING_RECORDING_REPOSITORY,
  TOEIC_SPEAKING_RECORDING_STORAGE,
  type SafePlaybackCapability,
  type SafeSpeakingRecording,
  type ToeicSpeakingRecordingRepository,
  type ToeicSpeakingRecordingStorage,
} from './toeic-recording.models';

function hashCapability(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function safeRecording(recording: {
  id: string;
  state: SafeSpeakingRecording['state'];
  contentType: ToeicRecordingContentType;
  durationSeconds: number;
  sizeBytes: number;
  expiresAt: Date;
}): SafeSpeakingRecording {
  return {
    recordingId: recording.id,
    state: recording.state,
    contentType: recording.contentType,
    durationSeconds: recording.durationSeconds,
    sizeBytes: recording.sizeBytes,
    expiresAt: recording.expiresAt,
  };
}

@Injectable()
export class ToeicRecordingService {
  constructor(
    @Inject(TOEIC_SPEAKING_RECORDING_REPOSITORY)
    private readonly repository: ToeicSpeakingRecordingRepository,
    @Inject(TOEIC_SPEAKING_RECORDING_STORAGE)
    private readonly storage: ToeicSpeakingRecordingStorage,
  ) {}

  async ensureForSubmission(
    principal: ApplicationPrincipal,
    session: SpeakingSessionRecord,
    contentType: unknown,
  ) {
    const submission = session.submission;
    if (session.status !== 'FINALIZED' || !submission) {
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.INCOMPLETE);
    }
    const normalizedContentType = this.validateMetadata(
      contentType,
      submission.durationSeconds,
      submission.sizeBytes,
    );
    const existing = await this.repository.findBySubmission(
      principal.applicationUserId,
      submission.id,
    );
    if (existing) return safeRecording(existing);

    const objectKey = `recordings/${principal.applicationUserId}/${submission.id}`;
    await this.storage.register({
      provider: 'local-controlled-recording',
      objectKey,
    });
    try {
      const created = await this.repository.create({
        submissionId: submission.id,
        sessionId: session.id,
        userId: principal.applicationUserId,
        contentType: normalizedContentType,
        durationSeconds: submission.durationSeconds,
        sizeBytes: submission.sizeBytes,
        submittedAt: submission.submittedAt,
        objectKey,
      });
      return safeRecording(created);
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) throw error;
      const replay = await this.repository.findBySubmission(
        principal.applicationUserId,
        submission.id,
      );
      if (replay) return safeRecording(replay);
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.CONFLICT);
    }
  }

  async get(principal: ApplicationPrincipal, recordingId: string) {
    const recording = await this.findCurrent(principal, recordingId);
    return { recording: safeRecording(recording) };
  }

  async issuePlayback(principal: ApplicationPrincipal, recordingId: string) {
    const recording = await this.findCurrent(principal, recordingId);
    const now = new Date();
    if (!canPlayback(recording.state, now, recording.expiresAt)) {
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.RECORDING_UNAVAILABLE);
    }
    const capability = randomBytes(32).toString('base64url');
    const expiresAt = playbackExpiresAt(now, recording.expiresAt);
    await this.repository.createCapability({
      recordingId: recording.id,
      userId: principal.applicationUserId,
      tokenHash: hashCapability(capability),
      expiresAt,
    });
    const result: SafePlaybackCapability = {
      recordingId: recording.id,
      capability,
      expiresAt,
    };
    return { playback: result };
  }

  async authorizePlayback(
    principal: ApplicationPrincipal,
    recordingId: string,
    capability: string | undefined,
  ) {
    if (!capability || capability.length < 32) {
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.CAPABILITY_INVALID);
    }
    const recording = await this.findCurrent(principal, recordingId);
    const now = new Date();
    if (!canPlayback(recording.state, now, recording.expiresAt)) {
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.RECORDING_UNAVAILABLE);
    }
    const token = await this.repository.findCapability(
      principal.applicationUserId,
      recordingId,
      hashCapability(capability),
    );
    if (
      !token ||
      token.revokedAt ||
      token.expiresAt.getTime() <= now.getTime()
    ) {
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.CAPABILITY_INVALID);
    }
    return {
      recording: safeRecording(recording),
      playback: { authorized: true as const, expiresAt: token.expiresAt },
    };
  }

  async revoke(principal: ApplicationPrincipal, recordingId: string) {
    await this.findCurrent(principal, recordingId);
    await this.repository.revoke(
      principal.applicationUserId,
      recordingId,
      new Date(),
    );
    return { revoked: true as const };
  }

  private async findCurrent(
    principal: ApplicationPrincipal,
    recordingId: string,
  ) {
    const recording = await this.repository.findById(
      principal.applicationUserId,
      recordingId,
    );
    if (!recording) throw new ToeicQuestionError(TOEIC_ERROR_CODES.NOT_FOUND);
    if (
      recording.state === 'AVAILABLE' &&
      recording.expiresAt.getTime() <= Date.now()
    ) {
      await this.repository.markExpired(
        principal.applicationUserId,
        recordingId,
      );
      return { ...recording, state: 'EXPIRED' as const };
    }
    return recording;
  }

  private validateMetadata(
    contentType: unknown,
    durationSeconds: number,
    sizeBytes: number,
  ): ToeicRecordingContentType {
    if (
      !isToeicRecordingContentType(contentType) ||
      !Number.isInteger(durationSeconds) ||
      durationSeconds < 1 ||
      durationSeconds > TOEIC_RECORDING_MAX_DURATION_SECONDS ||
      !Number.isInteger(sizeBytes) ||
      sizeBytes < 1 ||
      sizeBytes > TOEIC_RECORDING_MAX_SIZE_BYTES
    ) {
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.INVALID_CONTENT);
    }
    return contentType;
  }

  private isUniqueConstraintError(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }
}
