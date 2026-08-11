import type {
  ControlledRecordingReference,
  ToeicSpeakingRecordingStorage,
} from './toeic-recording.models';

export const TOEIC_LOCAL_RECORDING_PROVIDER = 'local-controlled-recording';

/** Credential-free state adapter for local/test. It intentionally stores no bytes. */
export class LocalToeicSpeakingRecordingStorage implements ToeicSpeakingRecordingStorage {
  register(reference: ControlledRecordingReference) {
    if (
      reference.provider !== TOEIC_LOCAL_RECORDING_PROVIDER ||
      !reference.objectKey.trim()
    ) {
      return Promise.reject(new Error('RECORDING_STORAGE_REFERENCE_INVALID'));
    }
    return Promise.resolve({ state: 'AVAILABLE' as const });
  }
}
