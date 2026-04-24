import type { createPartializedState } from './store';

// The persisted shape is whatever partialize writes, not the full store.
type PersistedState = ReturnType<typeof createPartializedState>;

// Zustand persist migrate hook.
//
// We have no field transforms yet (schema is v1), so this is a passthrough:
// returning the persisted state tells persist "this data is current", which
// PRESERVES the user's chats/settings across version bumps. Without a migrate
// function, persist discards any state whose stored version differs from the
// current one and logs "couldn't be migrated since no migrate function was
// provided" — i.e. silent data loss for returning users.
//
// Add real transforms here when a future version renames/retypes/removes a
// field. Adding a new field with a default does NOT need a migration —
// persist deep-merges stored state with the initial state automatically.
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

  return state as PersistedState;
};
