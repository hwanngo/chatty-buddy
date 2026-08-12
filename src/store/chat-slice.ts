import { StoreSlice } from './store';
import { ChatInterface, FolderCollection } from '@type/chat';

export interface ChatSlice {
  chats?: ChatInterface[];
  currentChatIndex: number;
  generating: boolean;
  /**
   * When the in-flight request started, for the activity indicator's elapsed
   * timer. Runtime-only (like `generating`) — deliberately excluded from
   * `createPartializedState`, so it needs no schema migration and a reload
   * mid-request never resurrects a stale clock.
   */
  generatingStartedAt: number | null;
  error: string;
  folders: FolderCollection;
  setChats: (chats: ChatInterface[]) => void;
  setCurrentChatIndex: (currentChatIndex: number) => void;
  setGenerating: (generating: boolean) => void;
  setError: (error: string) => void;
  setFolders: (folders: FolderCollection) => void;
}

export const createChatSlice: StoreSlice<ChatSlice> = (set, get) => {
  return {
    currentChatIndex: -1,
    generating: false,
    generatingStartedAt: null,
    error: '',
    folders: {},
    setChats: (chats: ChatInterface[]) => {
      try {
        set((prev: ChatSlice) => ({
          ...prev,
          chats: chats,
        }));
      } catch (e: unknown) {
        // Notify if storage quota exceeded
        get().addToast('error', (e as Error).message);
        throw e;
      }
    },
    setCurrentChatIndex: (currentChatIndex: number) => {
      set((prev: ChatSlice) => ({
        ...prev,
        currentChatIndex: currentChatIndex,
      }));
    },
    setGenerating: (generating: boolean) => {
      set((prev: ChatSlice) => ({
        ...prev,
        generating: generating,
        // Stamp the clock on the false -> true edge only. Callers set this
        // flag more than once per request (retries, regenerate), and
        // re-stamping on a repeat `true` would reset a timer that is meant to
        // measure the whole wait.
        generatingStartedAt: generating
          ? prev.generating
            ? prev.generatingStartedAt
            : Date.now()
          : null,
      }));
    },
    setError: (error: string) => {
      set((prev: ChatSlice) => ({
        ...prev,
        error: error,
      }));
    },
    setFolders: (folders: FolderCollection) => {
      set((prev: ChatSlice) => ({
        ...prev,
        folders: folders,
      }));
    },
  };
};
