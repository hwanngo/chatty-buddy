import { describe, expect, it, vi } from 'vitest';
import { createDurableStorage } from './durableStorage';
describe('durable persistence boundary', () => {
  it('reuses encoded untouched histories while preserving the exact JSON envelope', () => {
    const readText = vi.fn(() => 'unchanged history');
    const unchanged = {
      get text() {
        return readText();
      },
    };
    const writes: string[] = [];
    const adapter = createDurableStorage(() => ({
      ...localStorage,
      setItem: (_name: string, value: string) => {
        writes.push(value);
      },
    }));
    adapter.setItem('state', {
      version: 4,
      state: { chats: [unchanged, { text: 'a' }] },
    });
    adapter.setItem('state', {
      version: 4,
      state: { chats: [unchanged, { text: 'ab' }] },
    });
    expect(readText).toHaveBeenCalledTimes(1);
    expect(JSON.parse(writes[1])).toEqual({
      version: 4,
      state: { chats: [{ text: 'unchanged history' }, { text: 'ab' }] },
    });
  });
  it('does not serialize/write unchanged persisted fields for runtime actions', () => {
    const setItem = vi.fn();
    const adapter = createDurableStorage<{ chats: object; key: string }>(
      () => ({ ...localStorage, setItem })
    );
    const chats = {};
    const first = { state: { chats, key: 'local' }, version: 4 };
    adapter.setItem('state', first);
    adapter.setItem('state', { state: { chats, key: 'local' }, version: 4 });
    expect(setItem).toHaveBeenCalledTimes(1);
  });
  it('does not acknowledge failed writes; retries them after capacity is restored', () => {
    const setItem = vi.fn().mockImplementationOnce(() => {
      throw new DOMException('Full', 'QuotaExceededError');
    });
    const adapter = createDurableStorage(() => ({ ...localStorage, setItem }));
    const value = { state: { chats: [] }, version: 4 };
    expect(() => adapter.setItem('state', value)).toThrow('Full');
    adapter.setItem('state', value);
    expect(setItem).toHaveBeenCalledTimes(2);
  });
});
