export const TOEIC_RECORDING_CONTENT_TYPES = [
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
] as const;
export type ToeicRecordingContentType =
  (typeof TOEIC_RECORDING_CONTENT_TYPES)[number];

export const TOEIC_RECORDING_MAX_SIZE_BYTES = 10_000_000;
export const TOEIC_RECORDING_MAX_DURATION_SECONDS = 3_600;
export const TOEIC_RECORDING_RETENTION_DAYS = 30;
export const TOEIC_PLAYBACK_CAPABILITY_TTL_SECONDS = 300;

export type ToeicRecordingState =
  'PENDING' | 'AVAILABLE' | 'REVOKED' | 'EXPIRED' | 'DELETED';

export function isToeicRecordingContentType(
  value: unknown,
): value is ToeicRecordingContentType {
  return (
    typeof value === 'string' &&
    TOEIC_RECORDING_CONTENT_TYPES.includes(value as ToeicRecordingContentType)
  );
}

export function recordingExpiresAt(submittedAt: Date) {
  return new Date(
    submittedAt.getTime() +
      TOEIC_RECORDING_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
}

export function playbackExpiresAt(now: Date, recordingExpiry: Date) {
  const capabilityExpiry = new Date(
    now.getTime() + TOEIC_PLAYBACK_CAPABILITY_TTL_SECONDS * 1000,
  );
  return capabilityExpiry < recordingExpiry
    ? capabilityExpiry
    : recordingExpiry;
}

export function canPlayback(
  state: ToeicRecordingState,
  now: Date,
  expiresAt: Date,
) {
  return state === 'AVAILABLE' && expiresAt.getTime() > now.getTime();
}
