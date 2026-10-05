import { describe, expect, it, vi } from 'vitest';
vi.mock('@store/store', () => ({
  default: {
    getState: () => ({ totalTokenUsed: {}, setTotalTokenUsed: vi.fn() }),
  },
}));
import countTokens, { limitMessageTokens } from './messageUtils';
import type { MessageInterface } from '@type/chat';
const message = (
  text: string,
  role: MessageInterface['role'] = 'user'
): MessageInterface => ({ role, content: [{ type: 'text', text }] });

describe('context selection', () => {
  it('rejects an oversized newest prompt instead of sending only the system prompt', () => {
    const messages = [
      message('system', 'system'),
      message('too long '.repeat(1000)),
    ];
    expect(() => limitMessageTokens(messages, 30, 'test', true)).toThrow(
      'latest message'
    );
  });
  it('retains original identities so trimmed display indexes can address their source', () => {
    const messages = [
      message('system', 'system'),
      message('old '.repeat(1000)),
      message('new'),
      message('answer', 'assistant'),
    ];
    const limited = limitMessageTokens(messages, 50, 'test');
    expect(limited.map((item) => messages.indexOf(item))).toEqual([0, 2, 3]);
  });
  it('counts later text blocks and tool arguments', () => {
    const basic = message('first');
    const expanded = {
      ...basic,
      content: [
        ...basic.content,
        { type: 'text' as const, text: 'second '.repeat(100) },
      ],
    };
    const tool = {
      ...basic,
      tool_calls: [
        {
          id: 'call',
          type: 'function' as const,
          function: { name: 'fetch_url', arguments: 'argument '.repeat(100) },
        },
      ],
    };
    expect(countTokens([expanded], 'test')).toBeGreaterThan(
      countTokens([basic], 'test') + 50
    );
    expect(countTokens([tool], 'test')).toBeGreaterThan(
      countTokens([basic], 'test') + 50
    );
  });
  it('does not leave an orphan tool response after trimming', () => {
    const call = {
      ...message('old '.repeat(1000), 'assistant'),
      tool_calls: [
        {
          id: 'call',
          type: 'function' as const,
          function: { name: 'fetch_url', arguments: '{}' },
        },
      ],
    };
    const result = { ...message('page', 'tool'), tool_call_id: 'call' };
    const latest = message('question');
    expect(
      limitMessageTokens([call, result, latest], 30, 'test', true)
    ).toEqual([latest]);
  });
});
