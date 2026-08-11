import { LocalToeicSpeakingRecordingStorage } from './toeic-recording.storage';

describe('LocalToeicSpeakingRecordingStorage', () => {
  it('reports availability without credentials or provider URLs', async () => {
    await expect(
      new LocalToeicSpeakingRecordingStorage().register({
        provider: 'local-controlled-recording',
        objectKey: 'internal/recording-001',
      }),
    ).resolves.toEqual({ state: 'AVAILABLE' });
  });

  it('rejects provider references outside the approved local boundary', async () => {
    await expect(
      new LocalToeicSpeakingRecordingStorage().register({
        provider: 'supabase',
        objectKey: 'bucket/object',
      }),
    ).rejects.toThrow('RECORDING_STORAGE_REFERENCE_INVALID');
  });
});
