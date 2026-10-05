import { describe, expect, it, vi } from 'vitest';
vi.mock('@store/store', () => ({ default: { getState: () => ({}) } }));
import { migrate, STORE_VERSION } from './migrate';
describe('storage v4 migration', () => {
  it('preserves explicit preferences and makes duplicate mutation identities unique', () => {
    const state = migrate(
      {
        titleModel: 'chosen',
        chats: [
          {
            id: 'same',
            messages: [
              { id: 'same', generationStatus: 'streaming' },
              { id: 'same' },
            ],
            config: {},
          },
          { id: 'same', messages: [], config: {} },
        ],
      },
      3
    );
    expect(STORE_VERSION).toBe(4);
    expect(state.titleModel).toBe('chosen');
    expect(state.chats?.[0].id).not.toBe(state.chats?.[1].id);
    expect(state.chats?.[0].messages[0].id).not.toBe(
      state.chats?.[0].messages[1].id
    );
    expect(state.chats?.[0].messages[0].generationStatus).toBe('cancelled');
    expect(state.chats?.[0].config.output_tokens).toBeUndefined();
  });
});
