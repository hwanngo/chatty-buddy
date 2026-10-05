import { describe, expect, it, vi } from 'vitest';
vi.mock('@store/store', () => ({ default: { getState: () => ({}) } }));
import { createCloudBackup, parseCloudBackup } from './cloudBackup';
import { STORE_VERSION } from '@store/migrate';
describe('cloud backup codec', () => {
  it('never serializes credentials, endpoints or runtime fields on any write', () => {
    const backup = createCloudBackup({
      apiKey: 'SYNTHETIC_SECRET',
      apiEndpoint: 'https://private.invalid',
      chats: [],
      folders: {},
      generating: true,
    });
    expect(backup).toEqual({
      version: STORE_VERSION,
      state: { chats: [], folders: {} },
    });
    expect(JSON.stringify(backup)).not.toContain('SECRET');
  });
  it('accepts historic raw and versioned formats, never restoring remote auth', () => {
    for (const input of [
      { chats: [], folders: {}, apiKey: 'SYNTHETIC_SECRET' },
      {
        version: 3,
        state: { chats: [], folders: {}, apiKey: 'SYNTHETIC_SECRET' },
      },
    ]) {
      expect(parseCloudBackup(input).state).toEqual({ chats: [], folders: {} });
    }
  });
  it('rejects error bodies, future versions and invalid folder references', () => {
    expect(() =>
      parseCloudBackup({ error: { message: 'unauthorized' } })
    ).toThrow();
    expect(() =>
      parseCloudBackup({ version: 999, state: { chats: [], folders: {} } })
    ).toThrow();
  });
});
