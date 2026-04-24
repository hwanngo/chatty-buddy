// Shared handle to the in-flight generation request so the Stop button can
// actually abort the network call (not just flip the `generating` flag).
// A module singleton because only one generation runs at a time.

let active: AbortController | null = null;

export const startAbortController = (): AbortController => {
  active = new AbortController();
  return active;
};

export const abortActiveController = (): void => {
  active?.abort();
  active = null;
};

export const clearAbortController = (): void => {
  active = null;
};

export const isAbortError = (e: unknown): boolean =>
  (e as Error)?.name === 'AbortError';
