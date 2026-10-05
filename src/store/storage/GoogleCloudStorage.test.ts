import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  read: vi.fn(),
  list: vi.fn(),
  state: {
    chats: [] as any[],
    folders: {},
    generating: false,
    addToast: vi.fn(),
  },
  cloud: { setSyncStatus: vi.fn(), setFileId: vi.fn() },
  subscriber: undefined as undefined | ((state: any) => void),
}));
vi.mock('@api/google-api', () => ({
  createDriveFile: mocks.create,
  getDriveFile: mocks.read,
  listDriveSnapshots: mocks.list,
}));
vi.mock('@store/store', () => ({
  default: {
    getState: () => mocks.state,
    setState: (patch: any) => Object.assign(mocks.state, patch),
    subscribe: (callback: (state: any) => void) => {
      mocks.subscriber = callback;
      return () => {
        mocks.subscriber = undefined;
      };
    },
  },
  createPartializedState: (state: any) => ({
    chats: state.chats,
    folders: state.folders,
  }),
}));
vi.mock('@store/cloud-auth-store', () => ({
  default: { getState: () => mocks.cloud },
}));
import {
  startCloudSync,
  stopCloudSync,
  mergeCloudChats,
} from './GoogleCloudStorage';
import { normalizeChats } from '@utils/import';
const makeChat = (content: string) =>
  normalizeChats([
    { id: 'chat', title: 'Example', messages: [{ role: 'user', content }] },
  ])[0];
beforeEach(() => {
  vi.useFakeTimers();
  Object.assign(mocks.state, { chats: [], folders: {}, generating: false });
  mocks.create.mockResolvedValue({ id: 'snapshot' });
  mocks.list.mockResolvedValue([]);
  mocks.read.mockResolvedValue({
    version: 4,
    state: { chats: [], folders: {} },
  });
});
afterEach(() => {
  stopCloudSync();
  vi.useRealTimers();
});
describe('immutable Drive backup lifecycle', () => {
  it('keeps conflicting revisions and does not duplicate them across reconnects', () => {
    const local = { chats: [makeChat('Local')], folders: {} };
    const remote = { chats: [makeChat('Remote')], folders: {} };
    const first = mergeCloudChats(local, remote, 'snapshot-1');
    expect(first.chats).toHaveLength(2);
    expect(first.chats[0].messages[0].content[0].text).toBe('Local');
    expect(first.chats[1].title).toContain('backup copy');
    expect(mergeCloudChats(first, remote, 'snapshot-2').chats).toHaveLength(2);
  });
  it('acknowledges only completed uploads and rejects failed initial backup', async () => {
    mocks.create.mockRejectedValueOnce(new Error('Offline'));
    await expect(startCloudSync('root', 'synthetic')).rejects.toThrow(
      'Offline'
    );
    expect(mocks.cloud.setSyncStatus).not.toHaveBeenCalledWith('synced');
    expect(mocks.state.addToast).toHaveBeenCalled();
  });
  it('uploads on a fixed deadline during continuous generation and cancels pending work on logout', async () => {
    await startCloudSync('root', 'synthetic');
    expect(mocks.create).toHaveBeenCalledTimes(1);
    mocks.state.generating = true;
    for (let n = 0; n < 30; n++) {
      mocks.state.chats = [makeChat(String(n))];
      mocks.subscriber?.(mocks.state);
      await vi.advanceTimersByTimeAsync(1000);
    }
    expect(mocks.create).toHaveBeenCalledTimes(2);
    mocks.state.chats = [makeChat('Pending')];
    mocks.subscriber?.(mocks.state);
    stopCloudSync();
    await vi.advanceTimersByTimeAsync(60000);
    expect(mocks.create).toHaveBeenCalledTimes(2);
    expect(mocks.state.chats[0].messages[0].content[0].text).toBe('Pending');
  });
  it('preserves folder edits made during cloud downloads', async () => {
    let resolve!: (value: unknown) => void;
    mocks.read.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      })
    );
    const pending = startCloudSync('root', 'synthetic');
    await vi.advanceTimersByTimeAsync(0);
    mocks.state.folders = {
      local: {
        id: 'local',
        name: 'Edited during download',
        expanded: false,
        order: 0,
      },
    };
    resolve({ version: 4, state: { chats: [], folders: {} } });
    await pending;
    expect(mocks.state.folders).toHaveProperty(
      'local.name',
      'Edited during download'
    );
  });
});
