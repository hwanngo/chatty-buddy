import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en-US' },
  }),
}));
vi.mock('@constants/modelLoader', () => ({
  isModelsReady: true,
  modelOptions: [],
  modelMaxToken: {},
  modelStreamSupport: {},
}));
vi.mock('@utils/messageUtils', () => ({
  limitMessageTokens: (messages: unknown[]) => messages,
  updateTotalTokenUsed: vi.fn(),
}));
vi.mock('@store/store', async () => {
  const { create } = await import('zustand');
  const store = create<Record<string, unknown>>((set) => ({
    setChats: (chats: unknown[]) => set({ chats }),
    setGenerating: (generating: boolean) => set({ generating }),
    setError: (error: string) => set({ error }),
    addToast: vi.fn(),
  }));
  return { default: store };
});
vi.mock('@api/api', () => ({
  getChatCompletion: vi.fn(),
  getChatCompletionStream: vi.fn(),
  getAnthropicChatCompletion: vi.fn(),
  getAnthropicChatCompletionStream: vi.fn(),
  getOllamaChatCompletion: vi.fn(),
  getOllamaChatCompletionStream: vi.fn(),
}));
import useSubmit from './useSubmit';
import useStore from '@store/store';
import { getChatCompletion, getChatCompletionStream } from '@api/api';
import { abortActiveController } from '@utils/abortController';
import { modelOptions, modelStreamSupport } from '@constants/modelLoader';
import type { ChatInterface } from '@type/chat';

const original: ChatInterface = {
  id: 'original',
  title: 'New Chat',
  titleSet: false,
  imageDetail: 'auto',
  config: {
    model: 'test',
    max_tokens: 10000,
    temperature: 1,
    top_p: 1,
    presence_penalty: 0,
    frequency_penalty: 0,
  },
  messages: [{ role: 'user', content: [{ type: 'text', text: 'hello' }] }],
};
const content = (id: string) =>
  useStore
    .getState()
    .chats!.find((chat) => chat.id === id)!
    .messages.at(-1)!.content[0].text;
const bytes = (value: string) => new TextEncoder().encode(value);
const token = (text: string) =>
  bytes(
    `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`
  );
const finish = bytes('data: [DONE]\n\n');
let push: ReadableStreamDefaultController<Uint8Array>;
beforeEach(() => {
  vi.mocked(getChatCompletionStream).mockImplementation(
    async () =>
      new ReadableStream({
        start(controller) {
          push = controller;
        },
      })
  );
  vi.mocked(getChatCompletion).mockResolvedValue({
    choices: [{ message: { content: 'Generated title' } }],
  });
  modelStreamSupport.test = true;
  modelOptions.splice(0);
  useStore.setState({
    chats: [structuredClone(original)],
    currentChatIndex: 0,
    generating: false,
    error: '',
    apiEndpoint: 'http://localhost:1234/v1/chat/completions',
    apiKey: '',
    apiType: 'openai',
    apiVersion: '',
    autoTitle: false,
    countTotalTokens: false,
    titleModel: 'test',
  });
});

describe('generation lifecycle', () => {
  it('writes to the original conversation after a clone is inserted at its old array index', async () => {
    const { result } = renderHook(() => useSubmit());
    let run!: Promise<void>;
    act(() => {
      run = result.current.handleSubmit();
    });
    await waitFor(() => expect(push).toBeDefined());
    act(() => {
      const original = useStore.getState().chats![0];
      useStore.setState({
        chats: [{ ...structuredClone(original), id: 'clone' }, original],
        currentChatIndex: 1,
      });
      push.enqueue(token('original answer'));
      push.enqueue(finish);
      push.close();
    });
    await act(async () => {
      await run;
    });
    expect(content('original')).toBe('original answer');
    expect(content('clone')).toBe('');
    expect(useStore.getState().generating).toBe(false);
  });
  it('does not resurrect a chat deleted while the network request is pending', async () => {
    const { result } = renderHook(() => useSubmit());
    let run!: Promise<void>;
    act(() => {
      run = result.current.handleSubmit();
    });
    await act(async () => {
      useStore.setState({ chats: [], currentChatIndex: -1 });
      await run;
    });
    expect(useStore.getState().chats).toEqual([]);
    expect(useStore.getState().generating).toBe(false);
  });
  it('prevents a cancelled title request from overwriting a new run or user edits', async () => {
    let resolveTitle!: (value: unknown) => void;
    vi.mocked(getChatCompletion).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveTitle = resolve;
        })
    );
    useStore.setState({ autoTitle: true });
    const { result } = renderHook(() => useSubmit());
    let oldRun!: Promise<void>;
    act(() => {
      oldRun = result.current.handleSubmit();
    });
    await act(async () => {
      push.enqueue(token('answer'));
      push.enqueue(finish);
      push.close();
    });
    await waitFor(() => expect(resolveTitle).toBeDefined());
    act(() => {
      abortActiveController();
      useStore.setState({ generating: false, autoTitle: false });
    });
    let newRun!: Promise<void>;
    act(() => {
      newRun = result.current.handleSubmit();
    });
    await act(async () => {
      resolveTitle({ choices: [{ message: { content: 'stale title' } }] });
      await oldRun;
    });
    expect(useStore.getState().generating).toBe(true);
    expect(useStore.getState().chats![0].title).toBe('New Chat');
    await act(async () => {
      push.enqueue(token('new answer'));
      push.enqueue(finish);
      push.close();
      await newRun;
    });
    expect(content('original')).toBe('new answer');
  });
  it('merges a title into the latest state without overwriting intervening edits', async () => {
    let resolveTitle!: (value: unknown) => void;
    vi.mocked(getChatCompletion).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveTitle = resolve;
        })
    );
    useStore.setState({ autoTitle: true });
    const { result } = renderHook(() => useSubmit());
    let run!: Promise<void>;
    act(() => {
      run = result.current.handleSubmit();
    });
    await act(async () => {
      push.enqueue(token('answer'));
      push.enqueue(finish);
      push.close();
    });
    await waitFor(() => expect(resolveTitle).toBeDefined());
    act(() => {
      useStore.setState({
        chats: useStore.getState().chats!.map((chat) => ({
          ...chat,
          title: 'My manual title',
          titleSet: true,
        })),
      });
    });
    await act(async () => {
      resolveTitle({ choices: [{ message: { content: 'generated title' } }] });
      await run;
    });
    expect(useStore.getState().chats![0].title).toBe('My manual title');
  });
  it('records a failed response status when the provider ends without completion', async () => {
    const { result } = renderHook(() => useSubmit());
    let run!: Promise<void>;
    act(() => {
      run = result.current.handleSubmit();
    });
    await act(async () => {
      push.enqueue(token('partial'));
      push.close();
      await run;
    });
    const answer = useStore.getState().chats![0].messages.at(-1)!;
    expect(answer.generationStatus).toBe('failed');
    expect(answer.generationError).toContain('before the provider confirmed');
    expect(content('original')).toBe('partial');
  });
  it('rejects unapproved nonstreaming tool calls instead of silently reporting success', async () => {
    modelStreamSupport.test = false;
    vi.mocked(getChatCompletion).mockResolvedValue({
      choices: [
        {
          message: {
            content: null,
            tool_calls: [
              {
                id: 'call',
                type: 'function',
                function: {
                  name: 'fetch_url',
                  arguments: '{"url":"https://example.com"}',
                },
              },
            ],
          },
        },
      ],
    });
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const { result } = renderHook(() => useSubmit());
    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(useStore.getState().error).toContain('disabled');
    expect(
      useStore.getState().chats![0].messages.at(-1)!.generationStatus
    ).toBe('failed');
  });
  it('stops a streamed disabled tool before either the reader or follow-up model request', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const { result } = renderHook(() => useSubmit());
    let run!: Promise<void>;
    act(() => {
      run = result.current.handleSubmit();
    });
    await act(async () => {
      push.enqueue(
        bytes(
          'data: ' +
            JSON.stringify({
              choices: [
                {
                  delta: {
                    tool_calls: [
                      {
                        index: 0,
                        id: 'call',
                        function: {
                          name: 'fetch_url',
                          arguments: '{"url":"https://example.com"}',
                        },
                      },
                    ],
                  },
                  finish_reason: 'tool_calls',
                },
              ],
            }) +
            '\n\n'
        )
      );
      push.close();
      await run;
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(getChatCompletionStream).toHaveBeenCalledTimes(1);
    expect(useStore.getState().error).toContain('disabled');
  });
  it('completes an opted-in nonstream tool round and accounts for both actual requests', async () => {
    modelStreamSupport.test = false;
    useStore.setState({
      countTotalTokens: true,
      chats: [
        {
          ...structuredClone(original),
          config: { ...original.config, fetchUrl: true },
        },
      ],
    });
    vi.mocked(getChatCompletion)
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: 'call',
                  type: 'function',
                  function: {
                    name: 'fetch_url',
                    arguments: '{"url":"https://example.com"}',
                  },
                },
              ],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: 'page summary' } }],
      });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('Page content '.repeat(30)))
    );
    const { result } = renderHook(() => useSubmit());
    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(getChatCompletion).toHaveBeenCalledTimes(2);
    const followup = vi.mocked(getChatCompletion).mock.calls[1][1];
    expect(followup.at(-1)?.role).toBe('tool');
    expect(followup.at(-1)?.tool_call_id).toBe('call');
    expect(content('original')).toBe('page summary');
    expect(
      useStore.getState().chats![0].messages.at(-1)?.generationStatus
    ).toBe('complete');
    const { updateTotalTokenUsed } = await import('@utils/messageUtils');
    expect(updateTotalTokenUsed).toHaveBeenCalledTimes(2);
    expect(vi.mocked(updateTotalTokenUsed).mock.calls[1][1]).toEqual(followup);
  });
  it('keeps endpoint credentials fixed across tool rounds after settings change', async () => {
    modelStreamSupport.test = false;
    useStore.setState({
      apiKey: 'original-key',
      chats: [
        {
          ...structuredClone(original),
          config: { ...original.config, fetchUrl: true },
        },
      ],
    });
    vi.mocked(getChatCompletion)
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: 'call',
                  type: 'function',
                  function: {
                    name: 'fetch_url',
                    arguments: '{"url":"https://example.com"}',
                  },
                },
              ],
            },
          },
        ],
      })
      .mockResolvedValueOnce({ choices: [{ message: { content: 'done' } }] });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => {
        useStore.setState({
          apiEndpoint: 'https://different.example/v1/chat/completions',
          apiKey: 'new-key',
        });
        return new Response('Page content '.repeat(30));
      })
    );
    const { result } = renderHook(() => useSubmit());
    await act(async () => {
      await result.current.handleSubmit();
    });
    for (const args of vi.mocked(getChatCompletion).mock.calls) {
      expect(args[0]).toBe('http://localhost:1234/v1/chat/completions');
      expect(args[3]).toBe('original-key');
    }
  });

  it('uses the served conversation model for local titles without rewriting an unavailable saved preference', async () => {
    modelOptions.push('test');
    useStore.setState({
      autoTitle: true,
      countTotalTokens: true,
      titleModel: 'hosted-preference',
    });
    const { result } = renderHook(() => useSubmit());
    let run!: Promise<void>;
    act(() => {
      run = result.current.handleSubmit();
    });
    await act(async () => {
      push.enqueue(token('local answer'));
      push.enqueue(finish);
      push.close();
      await run;
    });
    expect(vi.mocked(getChatCompletion).mock.calls[0][0]).toBe(
      'http://localhost:1234/v1/chat/completions'
    );
    expect(vi.mocked(getChatCompletion).mock.calls[0][2].model).toBe('test');
    expect(useStore.getState().titleModel).toBe('hosted-preference');
    expect(useStore.getState().chats![0].title).toBe('Generated title');
    expect(useStore.getState().addToast).toHaveBeenCalledWith(
      'warning',
      'errors.titleModelUnavailable'
    );
    const { updateTotalTokenUsed } = await import('@utils/messageUtils');
    expect(vi.mocked(updateTotalTokenUsed).mock.calls.at(-1)?.[0]).toBe('test');
  });
  it('does not infer that a title preference is missing before any model list is available', async () => {
    useStore.setState({ autoTitle: true, titleModel: 'hosted-preference' });
    const { result } = renderHook(() => useSubmit());
    let run!: Promise<void>;
    act(() => {
      run = result.current.handleSubmit();
    });
    await act(async () => {
      push.enqueue(token('answer'));
      push.enqueue(finish);
      push.close();
      await run;
    });
    expect(vi.mocked(getChatCompletion).mock.calls[0][2].model).toBe(
      'hosted-preference'
    );
    expect(useStore.getState().addToast).not.toHaveBeenCalledWith(
      'warning',
      'errors.titleModelUnavailable'
    );
  });
});
