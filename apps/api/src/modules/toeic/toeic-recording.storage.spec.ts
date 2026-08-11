import { LocalToeicSpeakingRecordingStorage } from './toeic-recording.storage';

describe('LocalToeicSpeakingRecordingStorage', () => {
  it('stores and reads local/test bytes without credentials or provider URLs', async () => {
    const storage = new LocalToeicSpeakingRecordingStorage();
    const reference = {
      provider: 'local-controlled-recording',
      objectKey: 'internal/recording-001',
    } as const;
    await expect(storage.register(reference)).resolves.toEqual({
      state: 'AVAILABLE',
    });
    const content = Buffer.from('safe-local-audio');
    await storage.write(reference, content, 'audio/webm');
    await expect(storage.read(reference)).resolves.toEqual(content);
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
