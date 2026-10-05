import { describe, expect, it } from 'vitest';
import { readGenerationStream, updateGenerationMessage } from './generation';
import type { ChatInterface } from '@type/chat';

const encode = new TextEncoder();
const makeStream = (parts: Uint8Array[]) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      parts.forEach((part) => controller.enqueue(part));
      controller.close();
    },
  });
const read = (
  source: string,
  protocol: 'openai' | 'anthropic' | 'ollama' = 'openai'
) =>
  readGenerationStream(
    makeStream([encode.encode(source)]),
    protocol,
    new AbortController().signal,
    () => undefined
  );

describe('generation streams', () => {
  it('preserves Vietnamese and emoji when every byte arrives separately, including split CRLF', async () => {
    const source =
      'data:' +
      JSON.stringify({ choices: [{ delta: { content: 'tiếng Việt 🌊' } }] }) +
      '\r\n\r\ndata: [DONE]\r\n\r\n';
    let rendered = '';
    const result = await readGenerationStream(
      makeStream([...encode.encode(source)].map((byte) => Uint8Array.of(byte))),
      'openai',
      new AbortController().signal,
      (text) => {
        rendered += text;
      }
    );
    expect(result.text).toBe('tiếng Việt 🌊');
    expect(rendered).toBe(result.text);
  });
  it('reads comments, optional spaces, event fields and multiline data', async () => {
    const result = await read(
      ': heartbeat\nevent: message\ndata: {"choices":\ndata: [{"delta":{"content":"ok"}}]}\n\ndata:[DONE]\n\n'
    );
    expect(result.text).toBe('ok');
  });
  it('surfaces protocol error events and malformed JSON', async () => {
    await expect(
      read(
        'event: error\ndata: {"type":"error","error":{"message":"overloaded"}}\n\n',
        'anthropic'
      )
    ).rejects.toThrow('overloaded');
    await expect(
      read('data: {"error":{"message":"denied"}}\n\n')
    ).rejects.toThrow('denied');
    await expect(read('{"error":"missing model"}\n', 'ollama')).rejects.toThrow(
      'missing model'
    );
    await expect(read('data: not JSON\n\n')).rejects.toThrow();
  });
  it('does not report an EOF-truncated response as successful', async () => {
    await expect(
      read('data: {"choices":[{"delta":{"content":"partial"}}]}\n\n')
    ).rejects.toThrow('before the provider confirmed');
  });
  it('folds reasoning and tool fragments without duplicating the function name', async () => {
    const events = [
      { choices: [{ delta: { reasoning: 'plan' } }] },
      {
        choices: [
          {
            delta: {
              tool_calls: [
                {
                  index: 0,
                  id: 'call',
                  function: { name: 'fetch_url', arguments: '{"url":' },
                },
              ],
            },
          },
        ],
      },
      {
        choices: [
          {
            delta: {
              tool_calls: [
                { index: 0, function: { arguments: '"https://example.com"}' } },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
      },
    ];
    const result = await read(
      events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('')
    );
    expect(result.text).toBe('<think>plan</think>');
    expect(result.toolCalls[0].function).toEqual({
      name: 'fetch_url',
      arguments: '{"url":"https://example.com"}',
    });
  });
  it('bounds model-controlled tool indexes', async () => {
    await expect(
      read(
        'data: {"choices":[{"delta":{"tool_calls":[{"index":9999999}]}}]}\n\n'
      )
    ).rejects.toThrow('tool-call limit');
  });
  it('releases readers on errors', async () => {
    const stream = makeStream([encode.encode('data: broken\n\n')]);
    await expect(
      readGenerationStream(
        stream,
        'openai',
        new AbortController().signal,
        () => undefined
      )
    ).rejects.toThrow();
    expect(stream.locked).toBe(false);
  });
});

describe('stable generation updates', () => {
  it('survives chat insertions and preserves unrelated references', () => {
    const target = {
      title: 'test',
      titleSet: false,
      imageDetail: 'auto',
      config: {
        model: 'test',
        max_tokens: 100,
        temperature: 1,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      },
      id: 'original',
      messages: [
        {
          id: 'response',
          role: 'assistant',
          content: [{ type: 'text', text: '' }],
        },
      ],
    } as ChatInterface;
    const clone = { ...target, id: 'clone' };
    const chats = updateGenerationMessage(
      [clone, target],
      'original',
      'response',
      (message) => ({ ...message, content: [{ type: 'text', text: 'END' }] })
    );
    expect(chats[0]).toBe(clone);
    expect(chats[1].messages[0].content[0].text).toBe('END');
    expect(target.messages[0].content[0].text).toBe('');
  });
  it('does not write into a replacement message after deletion', () => {
    const replacement = {
      id: 'original',
      messages: [{ id: 'other', role: 'user', content: [] }],
    } as unknown as ChatInterface;
    expect(
      updateGenerationMessage([replacement], 'original', 'response', () => {
        throw new Error('must not run');
      })[0]
    ).toBe(replacement);
  });
});
