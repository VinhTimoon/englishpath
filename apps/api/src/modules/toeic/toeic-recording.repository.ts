import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  ToeicSpeakingPlaybackCapability,
  ToeicSpeakingRecording,
} from '../../generated/prisma/client';
import type {
  PlaybackCapabilityCreate,
  PlaybackCapabilityRecord,
  RecordingCreate,
  SpeakingRecordingRecord,
  ToeicSpeakingRecordingRepository,
} from './toeic-recording.models';
import { recordingExpiresAt } from './toeic-recording.policy';

type RecordingDb = {
  toeicSpeakingRecording: {
    findFirst(args: Record<string, unknown>): Promise<unknown>;
    create(args: Record<string, unknown>): Promise<unknown>;
    updateMany(args: Record<string, unknown>): Promise<{ count: number }>;
  };
  toeicSpeakingPlaybackCapability: {
    findFirst(args: Record<string, unknown>): Promise<unknown>;
    create(args: Record<string, unknown>): Promise<unknown>;
  };
};

const RECORDING_SELECT = {
  id: true,
  submissionId: true,
  sessionId: true,
  userId: true,
  provider: true,
  objectKey: true,
  state: true,
  contentType: true,
  durationSeconds: true,
  sizeBytes: true,
  expiresAt: true,
  revokedAt: true,
  deletedAt: true,
} as const;
const CAPABILITY_SELECT = {
  id: true,
  recordingId: true,
  userId: true,
  tokenHash: true,
  expiresAt: true,
  revokedAt: true,
} as const;

function asRecording(value: unknown): SpeakingRecordingRecord {
  const row = value as ToeicSpeakingRecording;
  return {
    id: row.id,
    submissionId: row.submissionId,
    sessionId: row.sessionId,
    userId: row.userId,
    provider: row.provider,
    objectKey: row.objectKey,
    state: row.state,
    contentType: row.contentType as SpeakingRecordingRecord['contentType'],
    durationSeconds: row.durationSeconds,
    sizeBytes: row.sizeBytes,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
    deletedAt: row.deletedAt,
  };
}

function asCapability(value: unknown): PlaybackCapabilityRecord {
  const row = value as ToeicSpeakingPlaybackCapability;
  return {
    id: row.id,
    recordingId: row.recordingId,
    userId: row.userId,
    tokenHash: row.tokenHash,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
  };
}

@Injectable()
export class PrismaToeicSpeakingRecordingRepository implements ToeicSpeakingRecordingRepository {
  private readonly db: RecordingDb;

  constructor(prisma: PrismaService) {
    this.db = prisma as unknown as RecordingDb;
  }

  async findBySubmission(userId: string, submissionId: string) {
    const row = await this.db.toeicSpeakingRecording.findFirst({
      where: { userId, submissionId },
      select: RECORDING_SELECT,
    });
    return row ? asRecording(row) : null;
  }

  async findById(userId: string, recordingId: string) {
    const row = await this.db.toeicSpeakingRecording.findFirst({
      where: { userId, id: recordingId },
      select: RECORDING_SELECT,
    });
    return row ? asRecording(row) : null;
  }

  async create(input: RecordingCreate) {
    const row = await this.db.toeicSpeakingRecording.create({
      data: {
        submissionId: input.submissionId,
        sessionId: input.sessionId,
        userId: input.userId,
        provider: 'local-controlled-recording',
        objectKey: input.objectKey,
        state: 'AVAILABLE',
        contentType: input.contentType,
        durationSeconds: input.durationSeconds,
        sizeBytes: input.sizeBytes,
        expiresAt: recordingExpiresAt(input.submittedAt),
      },
      select: RECORDING_SELECT,
    });
    return asRecording(row);
  }

  async markExpired(userId: string, recordingId: string) {
    await this.db.toeicSpeakingRecording.updateMany({
      where: { userId, id: recordingId, state: 'AVAILABLE' },
      data: { state: 'EXPIRED' },
    });
  }

  async revoke(userId: string, recordingId: string, revokedAt: Date) {
    await this.db.toeicSpeakingRecording.updateMany({
      where: {
        userId,
        id: recordingId,
        state: { in: ['PENDING', 'AVAILABLE'] },
      },
      data: { state: 'REVOKED', revokedAt },
    });
  }

  async createCapability(input: PlaybackCapabilityCreate) {
    const row = await this.db.toeicSpeakingPlaybackCapability.create({
      data: input,
      select: CAPABILITY_SELECT,
    });
    return asCapability(row);
  }

  async findCapability(userId: string, recordingId: string, tokenHash: string) {
    const row = await this.db.toeicSpeakingPlaybackCapability.findFirst({
      where: { userId, recordingId, tokenHash },
      select: CAPABILITY_SELECT,
    });
    return row ? asCapability(row) : null;
  }
}
