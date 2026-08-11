import type {
  ControlledRecordingReference,
  ToeicSpeakingRecordingStorage,
} from './toeic-recording.models';

export const TOEIC_LOCAL_RECORDING_PROVIDER = 'local-controlled-recording';

/** Credential-free local/test adapter; production storage remains separately configured. */
export class LocalToeicSpeakingRecordingStorage implements ToeicSpeakingRecordingStorage {
  private readonly content = new Map<
    string,
    { bytes: Buffer; contentType: string }
  >();

  register(reference: ControlledRecordingReference) {
    if (
      reference.provider !== TOEIC_LOCAL_RECORDING_PROVIDER ||
      !reference.objectKey.trim()
    ) {
      return Promise.reject(new Error('RECORDING_STORAGE_REFERENCE_INVALID'));
    }
    return Promise.resolve({ state: 'AVAILABLE' as const });
  }

  write(
    reference: ControlledRecordingReference,
    content: Buffer,
    contentType: string,
  ) {
    if (
      reference.provider !== TOEIC_LOCAL_RECORDING_PROVIDER ||
      !reference.objectKey.trim() ||
      !Buffer.isBuffer(content) ||
      content.length < 1
    ) {
      return Promise.reject(new Error('RECORDING_STORAGE_REFERENCE_INVALID'));
    }
    this.content.set(reference.objectKey, {
      bytes: Buffer.from(content),
      contentType,
    });
    return Promise.resolve();
  }

  read(reference: ControlledRecordingReference) {
    if (reference.provider !== TOEIC_LOCAL_RECORDING_PROVIDER) {
      return Promise.resolve(null);
    }
    const stored = this.content.get(reference.objectKey);
    return Promise.resolve(stored ? Buffer.from(stored.bytes) : null);
  }
}
