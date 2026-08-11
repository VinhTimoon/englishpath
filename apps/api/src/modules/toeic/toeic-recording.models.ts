import type {
  ToeicRecordingContentType,
  ToeicRecordingState,
} from './toeic-recording.policy';

export const TOEIC_SPEAKING_RECORDING_REPOSITORY = Symbol(
  'TOEIC_SPEAKING_RECORDING_REPOSITORY',
);
export const TOEIC_SPEAKING_RECORDING_STORAGE = Symbol(
  'TOEIC_SPEAKING_RECORDING_STORAGE',
);

export type SpeakingRecordingRecord = Readonly<{
  id: string;
  submissionId: string;
  sessionId: string;
  userId: string;
  provider: string;
  objectKey: string;
  state: ToeicRecordingState;
  contentType: ToeicRecordingContentType;
  durationSeconds: number;
  sizeBytes: number;
  expiresAt: Date;
  revokedAt: Date | null;
  deletedAt: Date | null;
}>;

export type PlaybackCapabilityRecord = Readonly<{
  id: string;
  recordingId: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
}>;

export type RecordingCreate = Readonly<{
  submissionId: string;
  sessionId: string;
  userId: string;
  contentType: ToeicRecordingContentType;
  durationSeconds: number;
  sizeBytes: number;
  submittedAt: Date;
  objectKey: string;
}>;

export type PlaybackCapabilityCreate = Readonly<{
  recordingId: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}>;

export interface ToeicSpeakingRecordingRepository {
  findBySubmission(
    userId: string,
    submissionId: string,
  ): Promise<SpeakingRecordingRecord | null>;
  findById(
    userId: string,
    recordingId: string,
  ): Promise<SpeakingRecordingRecord | null>;
  create(input: RecordingCreate): Promise<SpeakingRecordingRecord>;
  markExpired(userId: string, recordingId: string): Promise<void>;
  revoke(userId: string, recordingId: string, revokedAt: Date): Promise<void>;
  createCapability(
    input: PlaybackCapabilityCreate,
  ): Promise<PlaybackCapabilityRecord>;
  findCapability(
    userId: string,
    recordingId: string,
    tokenHash: string,
  ): Promise<PlaybackCapabilityRecord | null>;
}

export type ControlledRecordingReference = Readonly<{
  provider: string;
  objectKey: string;
}>;

export interface ToeicSpeakingRecordingStorage {
  register(reference: ControlledRecordingReference): Promise<{
    state: 'AVAILABLE';
  }>;
}

export type SafeSpeakingRecording = Readonly<{
  recordingId: string;
  state: ToeicRecordingState;
  contentType: ToeicRecordingContentType;
  durationSeconds: number;
  sizeBytes: number;
  expiresAt: Date;
}>;

export type SafePlaybackCapability = Readonly<{
  recordingId: string;
  capability: string;
  expiresAt: Date;
}>;
