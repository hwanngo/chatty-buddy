import { describe, expect, it, vi } from 'vitest';
import {
  buildOpenAIConfig,
  getAnthropicChatCompletion,
  getChatCompletion,
  getChatCompletionStream,
  getOllamaChatCompletion,
} from './api';
import type { ConfigInterface } from '@type/chat';
const config: ConfigInterface = {
  model: 'test',
  max_tokens: 128000,
  temperature: 0.7,
  top_p: 1,
  presence_penalty: 0,
  frequency_penalty: 0,
  think: true,
};
const messages = [
  {
    id: 'local-id',
    role: 'user' as const,
    content: [{ type: 'text' as const, text: 'hello' }],
  },
];

describe('provider request contracts', () => {
  it('whitelists OpenAI fields and omits internal message identities', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetch);
    await getChatCompletion(
      'http://localhost:1234/v1/chat/completions',
      messages,
      { ...config, fetchUrl: false, reasoningEffort: 'none' }
    );
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body).not.toHaveProperty('think');
    expect(body).not.toHaveProperty('max_tokens');
    expect(body).not.toHaveProperty('fetchUrl');
    expect(body.messages[0]).not.toHaveProperty('id');
    expect(body.reasoning_effort).toBe('none');
  });
  it('uses Chat Completions search contracts only on supported official search models', () => {
    expect(() =>
      buildOpenAIConfig('https://api.openai.com/v1/chat/completions', {
        ...config,
        webSearch: true,
      })
    ).toThrow('search model');
    expect(() =>
      buildOpenAIConfig(
        'https://api.openai.com.evil.test/v1/chat/completions',
        { ...config, model: 'gpt-5-search-api', webSearch: true }
      )
    ).toThrow();
    const body = buildOpenAIConfig(
      'https://api.openai.com/v1/chat/completions',
      { ...config, model: 'gpt-5-search-api', webSearch: true }
    );
    expect(body.web_search_options).toEqual({});
    expect(body).not.toHaveProperty('tools');
    expect(body).not.toHaveProperty('temperature');
  });
  it('keeps Anthropic output cap separate from the input budget', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetch);
    await getAnthropicChatCompletion(
      'https://api.anthropic.com/v1/messages',
      messages,
      config
    );
    expect(JSON.parse(fetch.mock.calls[0][1].body).max_tokens).toBe(4096);
    expect(
      fetch.mock.calls[0][1].headers[
        'anthropic-dangerous-direct-browser-access'
      ]
    ).toBe('true');
  });
  it('preserves native Ollama reasoning configuration and separate output options', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetch);
    await getOllamaChatCompletion(
      'http://localhost:11434/v1/chat/completions',
      messages,
      { ...config, think: false, output_tokens: 512 }
    );
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.think).toBe(false);
    expect(body.options.num_predict).toBe(512);
    expect(body.options).not.toHaveProperty('max_tokens');
    expect(fetch.mock.calls[0][0]).toBe('http://localhost:11434/api/chat');
  });
  it('shares Azure URL handling between stream and nonstream calls', async () => {
    const fetch = vi
      .fn()
      .mockImplementation(() => Promise.resolve(new Response('{}')));
    vi.stubGlobal('fetch', fetch);
    const endpoint =
      'https://example.openai.azure.com/openai/deployments/mine/chat/completions?api-version=old';
    await getChatCompletion(
      endpoint,
      messages,
      config,
      'synthetic',
      undefined,
      'new'
    );
    await getChatCompletionStream(
      endpoint,
      messages,
      config,
      'synthetic',
      undefined,
      'new'
    );
    expect(fetch.mock.calls[0][0]).toBe(fetch.mock.calls[1][0]);
    expect(fetch.mock.calls[0][0]).toBe(endpoint.replace('old', 'new'));
    expect(fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });
});
