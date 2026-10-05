import { describe, expect, it, vi } from 'vitest';
vi.mock('@constants/modelLoader', () => ({
  initializeModels: vi.fn(),
  modelOptions: ['test'],
}));
import useStore from './store';
describe('atomic store writes', () => {
  it('cancels interrupted v4 streams on hydration and preserves their text', async () => {
    localStorage.setItem(
      'chatty-buddy',
      JSON.stringify({
        version: 4,
        state: {
          chats: [
            {
              id: 'saved',
              messages: [
                {
                  id: 'answer',
                  role: 'assistant',
                  content: [{ type: 'text', text: 'Partial answer' }],
                  generationStatus: 'streaming',
                },
              ],
            },
          ],
        },
      })
    );
    await useStore.persist.rehydrate();
    expect(useStore.getState().chats?.[0].messages[0].generationStatus).toBe(
      'cancelled'
    );
    expect(useStore.getState().chats?.[0].messages[0].content[0].text).toBe(
      'Partial answer'
    );
    expect(useStore.getState().generating).toBe(false);
  });
  it('keeps prior memory and disk state on quota failure, without recursive toast failure', () => {
    useStore.setState({ chats: [], folders: {} });
    const before = useStore.getState().chats;
    const saved = localStorage.getItem('chatty-buddy');
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('Storage is full', 'QuotaExceededError');
      });
    expect(() => useStore.getState().setChats([{ id: 'new' } as any])).toThrow(
      'Storage is full'
    );
    expect(useStore.getState().chats).toBe(before);
    expect(localStorage.getItem('chatty-buddy')).toBe(saved);
    expect(useStore.getState().toasts.at(-1)?.message).toBe('Storage is full');
    expect(setItem).toHaveBeenCalledTimes(1);
  });
  it('persists title model and atomically rejects failed aggregate imports', () => {
    useStore.getState().setTitleModel('my-title-model');
    expect(
      JSON.parse(localStorage.getItem('chatty-buddy')!).state.titleModel
    ).toBe('my-title-model');
    const before = useStore.getState();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() =>
      useStore.setState({
        chats: [],
        folders: {
          imported: { id: 'imported', name: 'New', expanded: false, order: 1 },
        },
      })
    ).toThrow('quota');
    expect(useStore.getState().chats).toBe(before.chats);
    expect(useStore.getState().folders).toBe(before.folders);
  });
});
