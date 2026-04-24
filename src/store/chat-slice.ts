import { StoreSlice } from './store';
import { ChatInterface, FolderCollection } from '@type/chat';

export interface ChatSlice {
  chats?: ChatInterface[];
  currentChatIndex: number;
  generating: boolean;
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
        get().setToastMessage((e as Error).message);
        get().setToastStatus('error');
        get().setToastShow(true);
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
