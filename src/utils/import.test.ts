import { describe, expect, it, vi } from 'vitest';
vi.mock('@store/store', () => ({ default: { getState: () => ({}) } }));
import {
  createChatExport,
  mergeChatImport,
  normalizeChats,
  parseChatImport,
  convertOpenAIToChattyBuddyFormat,
} from './import';
const chat = () => ({
  id: 'a',
  title: 'Test',
  titleSet: false,
  messages: [{ role: 'user', content: 'Hello' }],
  config: { temperature: 0 },
});
describe('backup and import contracts', () => {
  it('installs missing config defaults and preserves temperature zero', () => {
    const [result] = normalizeChats([chat()]);
    expect(result.config.temperature).toBe(0);
    expect(result.config.max_tokens).toBeGreaterThan(0);
    expect(
      normalizeChats([{ ...chat(), config: undefined }])[0].config.model
    ).toBeTruthy();
  });
  it('roundtrips tool transcripts and per-chat exports', () => {
    const [value] = normalizeChats([
      {
        ...chat(),
        messages: [
          {
            role: 'assistant',
            content: [],
            tool_calls: [
              {
                id: 'call',
                type: 'function',
                function: { name: 'fetch_url', arguments: '{}' },
              },
            ],
          },
          {
            role: 'tool',
            content: 'Page',
            tool_call_id: 'call',
            tool_name: 'fetch_url',
          },
        ],
      },
    ]);
    expect(
      parseChatImport(JSON.parse(JSON.stringify(createChatExport([value]))))
        .chats[0]
    ).toEqual(value);
    expect(parseChatImport(value).chats[0]).toEqual(value);
  });
  it('preserves playground string content', () => {
    const value = convertOpenAIToChattyBuddyFormat({
      messages: [{ role: 'user', content: 'Important text' }],
    });
    expect(value.messages[0].content).toEqual([
      { type: 'text', text: 'Important text' },
    ]);
  });
  it('rejects malformed blocks, references, bounds and null inputs', () => {
    for (const input of [
      null,
      [null],
      [{ ...chat(), messages: [{ role: 'user', content: [] }] }],
      [{ ...chat(), config: { temperature: Infinity } }],
      [{ ...chat(), messages: [{ role: 'user', content: [null] }] }],
    ]) {
      expect(() => parseChatImport(input)).toThrow();
    }
    expect(() =>
      parseChatImport({
        version: 1,
        chats: [{ ...chat(), folder: 'missing' }],
        folders: {},
      })
    ).toThrow();
  });
  it('rejects parent cycles without recursion or unbounded loops', () => {
    const node = { id: 'a', parent: 'a', children: [], message: null };
    expect(() =>
      convertOpenAIToChattyBuddyFormat({
        current_node: 'a',
        mapping: { a: node },
      })
    ).toThrow(/cycle/);
    expect(() =>
      convertOpenAIToChattyBuddyFormat({ mapping: { a: node } })
    ).toThrow(/cycle/);
  });
  it('gives duplicate IDs distinct mutation targets and imports atomically', () => {
    const chats = normalizeChats([chat(), chat()]);
    expect(chats[0].id).not.toBe(chats[1].id);
    const result = mergeChatImport(
      { chats: [chats[0]], folders: {} },
      { chats, folders: {} }
    );
    expect(new Set(result.chats.map((value) => value.id)).size).toBe(3);
    expect(result.currentChatIndex).toBe(0);
  });
});
