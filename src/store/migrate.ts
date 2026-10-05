import type { createPartializedState } from './store';
import { v4 as uuidv4 } from 'uuid';
import { defaultModel } from '@constants/chat';

export const STORE_VERSION = 4;

// The persisted shape is whatever partialize writes, not the full store.
type PersistedState = ReturnType<typeof createPartializedState>;

// Zustand persist migrate hook.
//
// Transforms are applied in order, each guarded by the version it upgrades
// from, so a user arriving from any older schema picks up every step in turn.
// Returning the persisted state tells persist "this data is current", which
// PRESERVES the user's chats/settings across version bumps. Without a migrate
// function, persist discards any state whose stored version differs from the
// current one and logs "couldn't be migrated since no migrate function was
// provided" — i.e. silent data loss for returning users.
//
// Add real transforms here when a future version renames/retypes/removes a
// field. Persist only shallow-merges state; nested defaults need explicit
// migrations when their persisted schema changes.
//
// `import type` above keeps this a type-only import, so there is no runtime
// circular dependency with store.ts.
export const migrate = (
  persistedState: unknown,
  version: number
): PersistedState => {
  const state = persistedState as Record<string, unknown> | null;

  // v1 -> v2: introduce `autoModel` (auto-track the latest OpenAI default
  // model). Opt in users who are still on the old hardcoded default ('gpt-5.4');
  // preserve an explicit model choice by opting them out.
  if (state && version < 2 && state.autoModel === undefined) {
    const cfg = state.defaultChatConfig as { model?: string } | undefined;
    state.autoModel = cfg?.model === 'gpt-5.4';
  }

  // v2 -> v3: turn `inlineLatex` on. It defaulted to off because single-dollar
  // math used to swallow prices — "costs $5 and shipping is $10" rendered as
  // mangled italics — which meant every `$O(n)$` in an answer showed up as raw
  // text instead. `preprocessLaTeX` now escapes currency-looking dollars
  // (see `@utils/latex`), so the reason to keep it off is gone.
  //
  // This overrides an explicitly-off setting, which is the deliberate call:
  // the old value encoded "avoid the currency bug", not "never render math".
  // The toggle stays in Settings for anyone who genuinely wants math off.
  if (state && version < 3) {
    state.inlineLatex = true;
  }

  if (state && version < 4) {
    state.titleModel =
      typeof state.titleModel === 'string' ? state.titleModel : defaultModel;
    const chats = Array.isArray(state.chats) ? state.chats : [];
    const chatIds = new Set<string>();
    for (const chat of chats) {
      if (!chat || typeof chat !== 'object') continue;
      if (typeof chat.id !== 'string' || !chat.id || chatIds.has(chat.id))
        chat.id = uuidv4();
      chatIds.add(chat.id);
      const messageIds = new Set<string>();
      for (const message of Array.isArray(chat.messages) ? chat.messages : []) {
        if (!message || typeof message !== 'object') continue;
        if (
          typeof message.id !== 'string' ||
          !message.id ||
          messageIds.has(message.id)
        )
          message.id = uuidv4();
        messageIds.add(message.id);
        if (message.generationStatus === 'streaming')
          message.generationStatus = 'cancelled';
      }
    }
  }

  return state as PersistedState;
};
