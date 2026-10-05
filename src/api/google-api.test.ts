import { describe, expect, it, vi } from 'vitest';
vi.mock('@store/store', () => ({ default: { getState: () => ({}) } }));
import {
  createDriveFile,
  getDriveFile,
  listDriveFiles,
  listDriveSnapshots,
} from './google-api';
describe('Drive HTTP boundaries', () => {
  it('checks HTTP failures before parsing a remote backup', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{}', { status: 403 }))
    );
    await expect(getDriveFile('file', 'synthetic')).rejects.toThrow('403');
  });
  it('filters unrelated JSON files and internal snapshots; follows pagination', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            files: [
              { id: 'wrong', name: 'unrelated.json' },
              { id: 'old', name: 'chatty-buddy.json' },
            ],
            nextPageToken: 'next',
          })
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            files: [
              {
                id: 'root',
                name: 'Renamed.json',
                appProperties: { application: 'chatty-buddy', kind: 'root' },
              },
              {
                id: 'hidden',
                name: 'chatty-buddy.json',
                appProperties: { kind: 'snapshot' },
              },
            ],
          })
        )
      );
    vi.stubGlobal('fetch', fetch);
    expect(
      (await listDriveFiles('synthetic')).files.map((file) => file.id)
    ).toEqual(['old', 'root']);
    expect(fetch.mock.calls[1][0]).toContain('pageToken=next');
  });
  it('loads newest snapshot per device without discarding other device histories', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            files: [
              { id: 'A-new', appProperties: { deviceId: 'A' } },
              { id: 'B', appProperties: { deviceId: 'B' } },
              { id: 'A-old', appProperties: { deviceId: 'A' } },
            ],
          })
        )
      )
    );
    expect(
      (await listDriveSnapshots('root', 'synthetic')).map((file) => file.id)
    ).toEqual(['A-new', 'B']);
  });
  it('creates immutable uploads with metadata and no forbidden Content-Length header', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ id: 'new' })));
    vi.stubGlobal('fetch', fetch);
    await createDriveFile(
      new File(['{}'], 'chatty-buddy.json', { type: 'application/json' }),
      'synthetic'
    );
    expect(fetch.mock.calls[0][1].method).toBe('POST');
    expect(fetch.mock.calls[0][1].headers).not.toHaveProperty('Content-Length');
    expect(fetch.mock.calls[0][0]).toContain('uploadType=multipart');
  });
});
