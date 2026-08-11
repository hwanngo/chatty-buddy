import { ModelCost } from '@type/chat';
import { loadModels } from '@utils/modelReader';

let modelOptions: string[] = [];
let modelMaxToken: { [key: string]: number } = {};
let modelCost: ModelCost = {};
let modelTypes: { [key: string]: string } = {};
let modelStreamSupport: { [key: string]: boolean } = {};
let modelDisplayNames: { [key: string]: string } = {};

export let isModelsReady = false;
const listeners = new Set<() => void>();
let inFlight: Promise<void> | null = null;
// A call that arrives while a load is already running can't be satisfied by
// that load: loadModels() reads apiEndpoint/apiType/customModels etc. at call
// time, so an in-flight promise reflects whatever settings were current when
// IT started, not the caller's. Such a call flags a trailing re-run instead
// of being coalesced into a result it never influenced.
let rerunRequested = false;
// Set while listeners are being notified. A listener that reacts to a load by
// calling reloadModels() would otherwise flag a re-run of the load it is
// reacting to, whose notification flags another, forever. Its request is
// redundant anyway — it is holding the list that load just published.
let notifying = false;

/**
 * Subscribe to model-list loads. Fires immediately when a list is already
 * loaded, and again after every reload, so menus holding a snapshot of
 * `modelOptions` can refresh when the API endpoint changes.
 */
export const onModelsReady = (fn: () => void): (() => void) => {
  if (isModelsReady) fn();
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/**
 * One load attempt. On success, publishes the new tables and notifies
 * listeners. On failure — e.g. offline with no cache and no bundled snapshot
 * — warns and leaves the previously published tables untouched: a failed
 * reload must not make listeners re-read unchanged tables as if a refresh
 * happened, and `isModelsReady` must never flip back to false.
 *
 * The warning distinguishes "this was the very first load" from "this was a
 * later reload": `isModelsReady` is still false only when no load has ever
 * succeeded, so a failure at that point leaves the picker permanently empty
 * until something calls `reloadModels()` again — worth shouting about
 * differently than a reload failure, which just leaves a working picker
 * stale.
 */
const runLoad = async (): Promise<void> => {
  let loaded = false;
  try {
    const models = await loadModels();
    modelOptions = models.modelOptions;
    modelMaxToken = models.modelMaxToken;
    modelCost = models.modelCost;
    modelTypes = models.modelTypes;
    modelStreamSupport = models.modelStreamSupport;
    modelDisplayNames = models.modelDisplayNames;
    isModelsReady = true;
    loaded = true;
  } catch (err) {
    if (isModelsReady) {
      console.warn(
        '[modelLoader] reload failed; keeping the previous model list',
        err
      );
    } else {
      console.warn(
        '[modelLoader] INITIAL model list load failed — the picker will stay ' +
          'empty until a reload succeeds (e.g. via reloadModels())',
        err
      );
    }
  }
  if (!loaded) return;

  // Notification sits outside the load's try: a listener that throws is a bug
  // in the listener, not a failed load, and must neither be reported as one
  // nor stop the listeners after it from being told.
  notifying = true;
  try {
    listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.warn('[modelLoader] a model-list listener threw', err);
      }
    });
  } finally {
    notifying = false;
  }
};

export const initializeModels = async (): Promise<void> => {
  // Coalesce concurrent callers, but not by treating "already loading" as
  // equivalent to "already loading with my inputs": a call that arrives
  // mid-load flags a trailing re-run so its settings still get read once the
  // current load finishes, instead of being silently dropped. Two rapid
  // calls both just set the same flag, so at most one trailing re-run runs
  // per in-flight load.
  if (inFlight) {
    if (!notifying) rerunRequested = true;
    return inFlight;
  }

  // `done`/`settle` are wired up and `inFlight` is pointed at `done` before
  // any async work starts, so the cleanup in the IIFE's `finally` below can
  // never race the assignment that publishes it — even a synchronous throw
  // inside the IIFE would settle `done` only after `inFlight` already held it.
  let settle!: () => void;
  const done = new Promise<void>((resolve) => {
    settle = resolve;
  });
  inFlight = done;

  (async () => {
    try {
      await runLoad();
      while (rerunRequested) {
        rerunRequested = false;
        await runLoad();
      }
    } finally {
      inFlight = null;
      settle();
    }
  })();

  return done;
};

/** Re-reads the model list after the API settings change. */
export const reloadModels = initializeModels;

// This module sits in an import cycle: modelLoader -> modelReader -> the
// store -> custom-models-slice (which imports `initializeModels` from this
// very file) -> back to modelLoader. loadModels() reads `useStore.getState()`
// as its first statement, so calling `initializeModels()` synchronously here
// — while that cycle's module graph is still being evaluated — would read
// `useStore` before its binding is live and throw; `runLoad`'s catch would
// swallow that, leaving the app with a permanently empty picker and only a
// console warning to show for it. Deferring the kickoff onto a fresh macrotask
// guarantees the whole module graph has finished evaluating, and every
// binding involved is live, before the first store read ever happens.
setTimeout(() => {
  initializeModels();
}, 0);

export {
  modelOptions,
  modelMaxToken,
  modelCost,
  modelTypes,
  modelStreamSupport,
};
