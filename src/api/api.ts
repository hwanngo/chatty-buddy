import { AnthropicMessage } from '@type/api';
import {
  ConfigInterface,
  ImageContentInterface,
  MessageInterface,
  TextContentInterface,
} from '@type/chat';
import { isAzureEndpoint } from '@utils/api';
import { assertSafeApiEndpoint } from '@utils/url';
import { ModelOptions } from '@utils/modelReader';

/**
 * fetch wrapper that turns opaque network failures (DNS, CORS, offline) into a
 * readable message, while letting user-initiated AbortError propagate untouched
 * so the caller can recognise a cancelled request.
 */
const safeFetch = async (
  endpoint: string,
  init: RequestInit
): Promise<Response> => {
  try {
    return await fetch(endpoint, init);
  } catch (e: unknown) {
    if ((e as Error)?.name === 'AbortError') throw e;
    throw new Error(
      'Network error: could not reach the API endpoint. Check your connection and the endpoint URL.'
    );
  }
};

/**
 * Turns a raw HTTP error body into something worth showing a user. Provider
 * error pages are often full HTML or huge JSON blobs; pull out the message when
 * we can, otherwise fall back to the status line instead of dumping the body.
 */
const cleanErrorText = (
  raw: string,
  status: number,
  statusText: string
): string => {
  const body = raw ?? '';
  if (!body.trim() || /^\s*</.test(body)) {
    return `Request failed (HTTP ${status}${statusText ? ` ${statusText}` : ''}).`;
  }
  try {
    const json = JSON.parse(body);
    const msg = json?.error?.message ?? json?.message ?? json?.error;
    if (typeof msg === 'string' && msg) return msg;
  } catch {
    // not JSON — fall through to the trimmed raw body
  }
  return body.length > 800 ? `${body.slice(0, 800)}…` : body;
};

/**
 * Converts the internal OpenAI-style message array to Anthropic Messages API format.
 * - Extracts `role: "system"` messages into a top-level `system` string.
 * - Converts `image_url` blocks (data URIs or https URLs) to Anthropic image source objects.
 */
function convertMessagesForAnthropic(messages: MessageInterface[]): {
  systemPrompt: string | undefined;
  convertedMessages: Array<{
    role: 'user' | 'assistant';
    content: Array<Record<string, unknown>>;
  }>;
} {
  const systemMsgs = messages.filter((m) => m.role === 'system');
  const systemPrompt =
    systemMsgs.length > 0
      ? systemMsgs
          .flatMap((m) => m.content)
          .filter((c) => c.type === 'text')
          .map((c) => (c as TextContentInterface).text)
          .join('\n')
      : undefined;

  const convertedMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content.map((block): Record<string, unknown> => {
        if (block.type === 'text') {
          return { type: 'text', text: (block as TextContentInterface).text };
        }
        if (block.type === 'image_url') {
          const img = block as ImageContentInterface;
          const url = img.image_url.url;
          if (url.startsWith('data:')) {
            // data:<media_type>;base64,<data>
            const semicolonIdx = url.indexOf(';');
            const commaIdx = url.indexOf(',');
            const mediaType = url.slice(5, semicolonIdx);
            const data = url.slice(commaIdx + 1);
            return {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data },
            };
          }
          return {
            type: 'image',
            source: { type: 'url', url },
          };
        }
        return block as unknown as Record<string, unknown>;
      }),
    }));

  return { systemPrompt, convertedMessages };
}

export const getChatCompletion = async (
  endpoint: string,
  messages: MessageInterface[],
  config: ConfigInterface,
  apiKey?: string,
  customHeaders?: Record<string, string>,
  apiVersionToUse?: string,
  signal?: AbortSignal
) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  if (isAzureEndpoint(endpoint) && apiKey) {
    headers['api-key'] = apiKey;

    const modelmapping: Partial<Record<ModelOptions, string>> = {
      'gpt-3.5-turbo': 'gpt-35-turbo',
      'gpt-3.5-turbo-16k': 'gpt-35-turbo-16k',
      'gpt-3.5-turbo-1106': 'gpt-35-turbo-1106',
      'gpt-3.5-turbo-0125': 'gpt-35-turbo-0125',
    };

    const model = modelmapping[config.model] || config.model;

    const apiVersion = apiVersionToUse ?? '2024-02-01';

    const path = `openai/deployments/${model}/chat/completions?api-version=${apiVersion}`;

    if (!endpoint.endsWith(path)) {
      if (!endpoint.endsWith('/')) {
        endpoint += '/';
      }
      endpoint += path;
    }
  }
  endpoint = endpoint.trim();
  assertSafeApiEndpoint(endpoint);

  const { webSearch, reasoningEffort, ...apiConfig } = config;
  const response = await safeFetch(endpoint, {
    method: 'POST',
    headers,
    signal,
    body: JSON.stringify({
      messages,
      ...apiConfig,
      max_tokens: undefined,
      ...(webSearch ? { tools: [{ type: 'web_search_preview' }] } : {}),
      ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
    }),
  });
  if (!response.ok)
    throw new Error(
      cleanErrorText(await response.text(), response.status, response.statusText)
    );

  const data = await response.json();
  return data;
};

export const getChatCompletionStream = async (
  endpoint: string,
  messages: MessageInterface[],
  config: ConfigInterface,
  apiKey?: string,
  customHeaders?: Record<string, string>,
  apiVersionToUse?: string,
  signal?: AbortSignal
) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  if (isAzureEndpoint(endpoint) && apiKey) {
    headers['api-key'] = apiKey;

    const modelmapping: Partial<Record<ModelOptions, string>> = {
      'gpt-3.5-turbo': 'gpt-35-turbo',
      'gpt-3.5-turbo-16k': 'gpt-35-turbo-16k',
    };

    const model = modelmapping[config.model] || config.model;

    const apiVersion = apiVersionToUse ?? '2024-02-01';
    const path = `openai/deployments/${model}/chat/completions?api-version=${apiVersion}`;

    if (!endpoint.endsWith(path)) {
      if (!endpoint.endsWith('/')) {
        endpoint += '/';
      }
      endpoint += path;
    }
  }
  endpoint = endpoint.trim();
  assertSafeApiEndpoint(endpoint);
  const { webSearch, reasoningEffort, ...apiConfig } = config;
  const response = await safeFetch(endpoint, {
    method: 'POST',
    headers,
    signal,
    body: JSON.stringify({
      messages,
      ...apiConfig,
      max_tokens: undefined,
      stream: true,
      ...(webSearch ? { tools: [{ type: 'web_search_preview' }] } : {}),
      ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
    }),
  });
  if (response.status === 404 || response.status === 405) {
    const text = await response.text();

    if (text.includes('model_not_found')) {
      throw new Error(
        cleanErrorText(text, response.status, response.statusText) +
          '\nMessage from chatty-buddy:\nPlease ensure that you have access to the GPT-4 API!'
      );
    } else {
      throw new Error(
        'Message from chatty-buddy:\nInvalid API endpoint! We recommend you to check your free API endpoint.'
      );
    }
  }

  if (response.status === 429 || !response.ok) {
    const text = await response.text();
    let error = cleanErrorText(text, response.status, response.statusText);
    if (text.includes('insufficient_quota')) {
      error +=
        '\nMessage from chatty-buddy:\nWe recommend changing your API endpoint or API key';
    } else if (response.status === 429) {
      error += '\nRate limited!';
    }
    throw new Error(error);
  }

  const stream = response.body;
  return stream;
};

export const getAnthropicChatCompletion = async (
  endpoint: string,
  messages: MessageInterface[],
  config: ConfigInterface,
  apiKey?: string,
  signal?: AbortSignal
): Promise<AnthropicMessage> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01',
  };
  if (apiKey) headers['x-api-key'] = apiKey;

  const { systemPrompt, convertedMessages } =
    convertMessagesForAnthropic(messages);

  const body: Record<string, unknown> = {
    model: config.model,
    max_tokens: config.max_tokens,
    messages: convertedMessages,
    ...(config.temperature !== undefined && {
      temperature: config.temperature,
    }),
    ...(config.top_p !== undefined && { top_p: config.top_p }),
    ...(systemPrompt !== undefined && { system: systemPrompt }),
  };

  assertSafeApiEndpoint(endpoint);
  const response = await safeFetch(endpoint.trim(), {
    method: 'POST',
    headers,
    signal,
    body: JSON.stringify(body),
  });

  if (!response.ok)
    throw new Error(
      cleanErrorText(await response.text(), response.status, response.statusText)
    );
  return response.json() as Promise<AnthropicMessage>;
};

export const getAnthropicChatCompletionStream = async (
  endpoint: string,
  messages: MessageInterface[],
  config: ConfigInterface,
  apiKey?: string,
  signal?: AbortSignal
): Promise<ReadableStream<Uint8Array>> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01',
  };
  if (apiKey) headers['x-api-key'] = apiKey;

  const { systemPrompt, convertedMessages } =
    convertMessagesForAnthropic(messages);

  const body: Record<string, unknown> = {
    model: config.model,
    max_tokens: config.max_tokens,
    messages: convertedMessages,
    stream: true,
    ...(config.temperature !== undefined && {
      temperature: config.temperature,
    }),
    ...(config.top_p !== undefined && { top_p: config.top_p }),
    ...(systemPrompt !== undefined && { system: systemPrompt }),
  };

  assertSafeApiEndpoint(endpoint);
  const response = await safeFetch(endpoint.trim(), {
    method: 'POST',
    headers,
    signal,
    body: JSON.stringify(body),
  });

  if (!response.ok)
    throw new Error(
      cleanErrorText(await response.text(), response.status, response.statusText)
    );

  if (!response.body) {
    throw new Error(
      'Response body is null — streaming not supported by this endpoint.'
    );
  }

  return response.body;
};
