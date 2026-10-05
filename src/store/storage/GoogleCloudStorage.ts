import { v4 as uuidv4 } from 'uuid';
import useCloudAuthStore from '@store/cloud-auth-store';
import useStore, { createPartializedState } from '@store/store';
import {
  createDriveFile,
  getDriveFile,
  listDriveSnapshots,
} from '@api/google-api';
import { cloudBackupFile, parseCloudBackup } from './cloudBackup';
import type { ChatInterface, FolderCollection } from '@type/chat';

type Session = {
  controller: AbortController;
  timer?: ReturnType<typeof setTimeout>;
  unsubscribe?: () => void;
  dirty: boolean;
  running: boolean;
};
let session: Session | undefined;
export function stopCloudSync() {
  session?.controller.abort();
  if (session?.timer) clearTimeout(session.timer);
  session?.unsubscribe?.();
  session = undefined;
}
const semanticChat = (chat: ChatInterface) =>
  JSON.stringify({
    ...chat,
    title: chat.title.replace(/ \(backup copy\)$/, ''),
    id: undefined,
    folder: undefined,
    messages: chat.messages.map((message) => ({ ...message, id: undefined })),
  });

export function mergeCloudChats(
  local: { chats?: ChatInterface[]; folders: FolderCollection },
  remote: { chats?: ChatInterface[]; folders?: FolderCollection },
  sourceId: string
) {
  const chats = [...(local.chats ?? [])];
  const folders = { ...local.folders };
  const folderMap = new Map<string, string>();
  for (const [id, folder] of Object.entries(remote.folders ?? {})) {
    const targetId =
      folders[id] && folders[id].name !== folder.name
        ? `${id}:${sourceId}`
        : id;
    folders[targetId] = folders[targetId] ?? { ...folder, id: targetId };
    folderMap.set(id, targetId);
  }
  for (const chat of remote.chats ?? []) {
    const content = semanticChat(chat);
    if (chats.some((existing) => semanticChat(existing) === content)) continue;
    const conflict = chats.some((existing) => existing.id === chat.id);
    const id = conflict ? `${chat.id}:backup:${sourceId}` : chat.id;
    if (chats.some((existing) => existing.id === id)) continue;
    chats.push({
      ...chat,
      id,
      title: conflict ? `${chat.title} (backup copy)` : chat.title,
      ...(chat.folder ? { folder: folderMap.get(chat.folder) } : {}),
    });
  }
  return { chats, folders };
}

/** Local storage is always authoritative. Drive stores immutable, acknowledged
 * snapshots, never a shared mutable last-writer-wins file. A failed/aborted
 * request leaves every local edit and every earlier remote snapshot intact.
 */
export async function startCloudSync(fileId: string, accessToken: string) {
  stopCloudSync();
  const current: Session = {
    controller: new AbortController(),
    dirty: false,
    running: false,
  };
  session = current;
  const active = () =>
    session === current && !current.controller.signal.aborted;
  const cloud = useCloudAuthStore.getState;
  const fail = (error: unknown) => {
    if (!active()) return;
    stopCloudSync();
    cloud().setSyncStatus('unauthenticated');
    useStore
      .getState()
      .addToast(
        'error',
        error instanceof Error
          ? error.message
          : 'Cloud backup failed. Local changes are saved. Reconnect to retry.'
      );
  };
  try {
    cloud().setSyncStatus('syncing');
    const snapshots = await listDriveSnapshots(
      fileId,
      accessToken,
      current.controller.signal
    );
    // The original root is the initial snapshot until this group has writers.
    const files = snapshots.length ? snapshots : [{ id: fileId }];
    const loaded: {
      source: string;
      state: ReturnType<typeof parseCloudBackup>['state'];
    }[] = [];
    for (const file of files) {
      const backup = parseCloudBackup(
        await getDriveFile(file.id, accessToken, current.controller.signal)
      );
      if (!active())
        throw new DOMException('Cloud session changed.', 'AbortError');
      loaded.push({ source: file.id, state: backup.state });
    }
    if (!active())
      throw new DOMException('Cloud session changed.', 'AbortError');
    // All merging is synchronous after I/O, against BOTH live collections.
    // Edits made while downloading cannot be replaced by a stale snapshot.
    let merged = {
      chats: useStore.getState().chats,
      folders: useStore.getState().folders,
    };
    for (const backup of loaded)
      merged = mergeCloudChats(merged, backup.state, backup.source);
    useStore.setState({
      ...merged,
      currentChatIndex:
        useStore.getState().currentChatIndex >= 0
          ? useStore.getState().currentChatIndex
          : merged.chats?.length
            ? 0
            : -1,
    });
    cloud().setFileId(fileId);
    let deviceId = localStorage.getItem('chatty-buddy-device-id');
    if (!deviceId) {
      deviceId = uuidv4();
      localStorage.setItem('chatty-buddy-device-id', deviceId);
    }
    let previous = createPartializedState(useStore.getState());
    const save = async () => {
      if (!active() || current.running || !current.dirty) return;
      current.running = true;
      current.dirty = false;
      if (current.timer) clearTimeout(current.timer);
      current.timer = undefined;
      try {
        await createDriveFile(
          cloudBackupFile(useStore.getState()),
          accessToken,
          {
            application: 'chatty-buddy',
            kind: 'snapshot',
            backupGroup: fileId,
            deviceId: deviceId!,
          },
          current.controller.signal
        );
        if (!active()) return;
        cloud().setSyncStatus(current.dirty ? 'syncing' : 'synced');
      } catch (error) {
        fail(error);
        throw error;
      } finally {
        current.running = false;
        if (active() && current.dirty && !current.timer)
          current.timer = setTimeout(() => {
            void save().catch(() => {});
          }, 30000);
      }
    };
    current.unsubscribe = useStore.subscribe((state) => {
      const next = createPartializedState(state);
      const changed = (Object.keys(next) as (keyof typeof next)[]).some(
        (key) => next[key] !== previous[key]
      );
      previous = next;
      if (changed) {
        current.dirty = true;
        cloud().setSyncStatus('syncing');
        // Fixed deadline, not trailing debounce: continuous streams cannot
        // postpone cloud durability forever. Local durability is immediate.
        if (!current.timer)
          current.timer = setTimeout(() => {
            void save().catch(() => {});
          }, 30000);
      }
      if (!state.generating && current.dirty) void save().catch(() => {});
    });
    current.dirty = true;
    await save();
  } catch (error) {
    fail(error);
    throw error;
  }
}
