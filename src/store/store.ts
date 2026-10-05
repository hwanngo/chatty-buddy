import { StoreApi, create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ChatSlice, createChatSlice } from './chat-slice';
import { InputSlice, createInputSlice } from './input-slice';
import { AuthSlice, createAuthSlice } from './auth-slice';
import { ConfigSlice, createConfigSlice } from './config-slice';
import { PromptSlice, createPromptSlice } from './prompt-slice';
import { ToastSlice, createToastSlice } from './toast-slice';
import {
  CustomModelsSlice,
  createCustomModelsSlice,
} from './custom-models-slice';
import { migrate, STORE_VERSION } from './migrate';
import { createDurableStorage } from './storage/durableStorage';

export type StoreState = ChatSlice &
  InputSlice &
  AuthSlice &
  ConfigSlice &
  PromptSlice &
  ToastSlice &
  CustomModelsSlice;

export type StoreSlice<T> = (
  set: StoreApi<StoreState>['setState'],
  get: StoreApi<StoreState>['getState']
) => T;

export const createPartializedState = (state: StoreState) => ({
  chats: state.chats,
  currentChatIndex: state.currentChatIndex,
  apiKey: state.apiKey,
  apiVersion: state.apiVersion,
  apiType: state.apiType,
  apiEndpoint: state.apiEndpoint,
  theme: state.theme,
  autoTitle: state.autoTitle,
  titleModel: state.titleModel,
  advancedMode: state.advancedMode,
  prompts: state.prompts,
  defaultChatConfig: state.defaultChatConfig,
  autoModel: state.autoModel,
  defaultSystemMessage: state.defaultSystemMessage,
  hideMenuOptions: state.hideMenuOptions,
  firstVisit: state.firstVisit,
  hideSideMenu: state.hideSideMenu,
  folders: state.folders,
  enterToSubmit: state.enterToSubmit,
  inlineLatex: state.inlineLatex,
  markdownMode: state.markdownMode,
  totalTokenUsed: state.totalTokenUsed,
  countTotalTokens: state.countTotalTokens,
  displayChatSize: state.displayChatSize,
  menuWidth: state.menuWidth,
  defaultImageDetail: state.defaultImageDetail,
  autoScroll: state.autoScroll,
  customModels: state.customModels,
});

type PersistedState = ReturnType<typeof createPartializedState>;
const storage = createDurableStorage<PersistedState>(() => localStorage);
const preflight = (state: StoreState) =>
  storage.setItem('chatty-buddy', {
    state: createPartializedState(state),
    version: STORE_VERSION,
  });

const useStore = create<StoreState>()(
  persist(
    (set, get) => {
      const durableSet: typeof set = (partial, replace) => {
        const current = get();
        const patch =
          typeof partial === 'function' ? partial(current) : partial;
        const next = replace ? (patch as StoreState) : { ...current, ...patch };
        preflight(next);
        set(next, true);
      };
      return {
        ...createChatSlice(durableSet, get),
        ...createInputSlice(durableSet, get),
        ...createAuthSlice(durableSet, get),
        ...createConfigSlice(durableSet, get),
        ...createPromptSlice(durableSet, get),
        ...createToastSlice(durableSet, get),
        ...createCustomModelsSlice(durableSet, get),
      };
    },
    {
      name: 'chatty-buddy',
      partialize: (state) => createPartializedState(state),
      storage,
      version: STORE_VERSION,
      migrate,
      merge: (persisted, current) => {
        if (!persisted || typeof persisted !== 'object') return current;
        const saved = persisted as Partial<PersistedState>;
        const allowed = Object.fromEntries(
          Object.keys(createPartializedState(current))
            .filter((key) => key in saved)
            .map((key) => [key, saved[key as keyof PersistedState]])
        );
        const chats = saved.chats?.map((chat) => ({
          ...chat,
          messages: chat.messages.map((message) =>
            message.generationStatus === 'streaming'
              ? { ...message, generationStatus: 'cancelled' as const }
              : message
          ),
        }));
        return { ...current, ...allowed, ...(chats ? { chats } : {}) };
      },
    }
  )
);

// Imports and request-scoped updates also use the atomic durability boundary.
const originalSetState = useStore.setState;
useStore.setState = ((
  partial: Parameters<typeof originalSetState>[0],
  replace?: boolean
) => {
  const current = useStore.getState();
  const patch = typeof partial === 'function' ? partial(current) : partial;
  const next = replace ? (patch as StoreState) : { ...current, ...patch };
  preflight(next);
  originalSetState(next, true);
}) as typeof originalSetState;

export default useStore;
