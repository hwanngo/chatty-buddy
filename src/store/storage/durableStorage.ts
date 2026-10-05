import type { PersistStorage, StorageValue } from 'zustand/middleware';

/** Object-level adapter: runtime-only state never incurs JSON serialization.
 * Writes remain synchronous so a completed edit means a durable local write.
 */
export function createDurableStorage<S extends object>(
  getStorage: () => Storage
): PersistStorage<S> {
  let last: StorageValue<S> | undefined;
  // Immutable store updates retain untouched chats/messages by reference.
  // Cache their JSON so a streamed delta does not re-encode all chat history.
  const encoded = new WeakMap<object, string>();
  const encode = (
    value: unknown,
    ancestors = new WeakSet<object>()
  ): string | undefined => {
    if (value === null || typeof value !== 'object')
      return JSON.stringify(value);
    const cached = encoded.get(value);
    if (cached !== undefined) return cached;
    if (ancestors.has(value))
      throw new TypeError('Cannot persist circular state.');
    ancestors.add(value);
    const result = Array.isArray(value)
      ? `[${value.map((entry) => encode(entry, ancestors) ?? 'null').join(',')}]`
      : `{${Object.entries(value)
          .flatMap(([key, entry]) => {
            const text = encode(entry, ancestors);
            return text === undefined ? [] : [`${JSON.stringify(key)}:${text}`];
          })
          .join(',')}}`;
    ancestors.delete(value);
    encoded.set(value, result);
    return result;
  };
  const equal = (a: S, b: S) => {
    const keys = Object.keys(a) as (keyof S)[];
    return (
      keys.length === Object.keys(b).length &&
      keys.every((key) => Object.is(a[key], b[key]))
    );
  };
  return {
    getItem(name) {
      const raw = getStorage().getItem(name);
      return raw ? JSON.parse(raw) : null;
    },
    setItem(name, value) {
      if (
        last &&
        last.version === value.version &&
        equal(last.state, value.state)
      )
        return;
      getStorage().setItem(name, encode(value)!);
      // Only acknowledge after storage succeeds. Failed writes never poison
      // the cached state or trigger recursive writes from error toasts.
      last = value;
    },
    removeItem(name) {
      getStorage().removeItem(name);
      last = undefined;
    },
  };
}
