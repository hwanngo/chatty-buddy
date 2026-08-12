import { AnthropicMessage } from '@type/api';
import {
  ConfigInterface,
  ImageContentInterface,
  MessageInterface,
  TextContentInterface,
} from '@type/chat';
import {
  isAzureEndpoint,
  ollamaChatUrl,
  supportsOpenAIHostedTools,
} from '@utils/api';
import { TOOL_DEFINITIONS } from '@utils/tools';
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
    // `tool` messages come from the OpenAI-side tool loop; Anthropic has no
    // equivalent wired up, and mapping one would emit an invalid role.
    .filter((m) => m.role !== 'system' && m.role !== 'tool')
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

/**
 * Converts the internal message array to what an OpenAI-compatible endpoint
 * expects. Two things need fixing up, both of which providers are strict about:
 *
 * - A `tool` message's `content` must be a plain **string**. Internally every
 *   message holds a content-parts array (needed for images), which stricter
 *   servers reject on this role.
 * - `tool_name` is ours, for the transcript chip. Sending it would put an
 *   unknown field in the request body, the same way `fetchUrl` would if it
 *   weren't destructured out of the config.
 */
const toApiMessages = (messages: MessageInterface[]) =>
  messages.map((message) => {
    const { tool_name: _clientOnly, ...rest } = message;
    if (message.role !== 'tool') return rest;
    return {
      ...rest,
      content: message.content
        .filter((block) => block.type === 'text')
        .map((block) => (block as TextContentInterface).text)
        .join('\n'),
    };
  });

/**
 * Assembles the `tools` array for a request. Two kinds, and the distinction is
 * what makes this worth a function:
 *
 * - `web_search_preview` is **provider-hosted**: it has no function body, and
 *   only OpenAI can execute it. Offered to anyone else it is not ignored but
 *   actively harmful — the model can reason toward a tool that never resolves
 *   until generation dies with no content. Hence the host gate.
 * - `fetch_url` is **client-executed**: this app runs it, so it works against
 *   any OpenAI-compatible endpoint, local ones included.
 */
const buildTools = (
  endpoint: string,
  webSearch?: boolean,
  fetchUrl?: boolean
) => [
  ...(webSearch && supportsOpenAIHostedTools(endpoint)
    ? [{ type: 'web_search_preview' }]
    : []),
  ...(fetchUrl ? TOOL_DEFINITIONS : []),
];

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

  // `webSearch`, `reasoningEffort` and `fetchUrl` are client-side switches,
  // not model parameters — destructured out so `...apiConfig` can't leak them
  // into the request body as unknown fields.
  const { webSearch, reasoningEffort, fetchUrl, ...apiConfig } = config;
  const tools = buildTools(endpoint, webSearch, fetchUrl);
  const response = await safeFetch(endpoint, {
    method: 'POST',
    headers,
    signal,
    body: JSON.stringify({
      messages: toApiMessages(messages),
      ...apiConfig,
      max_tokens: undefined,
      ...(tools.length > 0 ? { tools } : {}),
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
  // `webSearch`, `reasoningEffort` and `fetchUrl` are client-side switches,
  // not model parameters — destructured out so `...apiConfig` can't leak them
  // into the request body as unknown fields.
  const { webSearch, reasoningEffort, fetchUrl, ...apiConfig } = config;
  const tools = buildTools(endpoint, webSearch, fetchUrl);
  const response = await safeFetch(endpoint, {
    method: 'POST',
    headers,
    signal,
    body: JSON.stringify({
      messages: toApiMessages(messages),
      ...apiConfig,
      max_tokens: undefined,
      stream: true,
      ...(tools.length > 0 ? { tools } : {}),
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

// ─── Ollama native API ────────────────────────────────────────────────────────

/**
 * Converts the internal message array to ollama's native shape.
 *
 * Three differences from the OpenAI form:
 * - `content` is a plain string, and images ride in a sibling `images` array
 *   of bare base64 (no data-URI prefix) rather than inside the content parts.
 * - a `tool` message identifies itself with `tool_name`, not `tool_call_id`.
 * - `tool_calls` carry their arguments as an object.
 */
const toOllamaMessages = (messages: MessageInterface[]) =>
  messages.map((message) => {
    const text = message.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as TextContentInterface).text)
      .join('\n');

    const images = message.content
      .filter((block) => block.type === 'image_url')
      .map((block) => {
        const url = (block as ImageContentInterface).image_url.url;
        // data:<media_type>;base64,<data> — ollama wants only the payload.
        const comma = url.indexOf(',');
        return url.startsWith('data:') && comma !== -1
          ? url.slice(comma + 1)
          : url;
      });

    return {
      role: message.role,
      content: text,
      ...(images.length > 0 ? { images } : {}),
      ...(message.tool_name ? { tool_name: message.tool_name } : {}),
      ...(message.tool_calls
        ? {
            tool_calls: message.tool_calls.map((call) => ({
              function: {
                name: call.function.name,
                arguments: (() => {
                  try {
                    return JSON.parse(call.function.arguments || '{}');
                  } catch {
                    return {};
                  }
                })(),
              },
            })),
          }
        : {}),
    };
  });

/**
 * Body shared by the streaming and non-streaming native calls.
 *
 * `think` is the reason this protocol exists at all: it is the only way found
 * to suppress a thinking model's reasoning on this server — the
 * OpenAI-compatible shim ignored every equivalent that was tried. Sent only
 * when explicitly disabled, so a model with no thinking mode is unaffected.
 */
const buildOllamaBody = (
  messages: MessageInterface[],
  config: ConfigInterface,
  stream: boolean
) => {
  const { webSearch, reasoningEffort, fetchUrl, think, model, ...rest } = config;
  return {
    model,
    messages: toOllamaMessages(messages),
    stream,
    ...(think === false ? { think: false } : {}),
    ...(fetchUrl ? { tools: TOOL_DEFINITIONS } : {}),
    // Sampling parameters live under `options` natively, not at the top level.
    options: {
      temperature: rest.temperature,
      top_p: rest.top_p,
      frequency_penalty: rest.frequency_penalty,
      presence_penalty: rest.presence_penalty,
    },
  };
};

export const getOllamaChatCompletion = async (
  endpoint: string,
  messages: MessageInterface[],
  config: ConfigInterface,
  apiKey?: string,
  signal?: AbortSignal
) => {
  const url = ollamaChatUrl(endpoint);
  assertSafeApiEndpoint(url);

  const response = await safeFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    signal,
    body: JSON.stringify(buildOllamaBody(messages, config, false)),
  });
  if (!response.ok)
    throw new Error(
      cleanErrorText(await response.text(), response.status, response.statusText)
    );
  return await response.json();
};

export const getOllamaChatCompletionStream = async (
  endpoint: string,
  messages: MessageInterface[],
  config: ConfigInterface,
  apiKey?: string,
  signal?: AbortSignal
) => {
  const url = ollamaChatUrl(endpoint);
  assertSafeApiEndpoint(url);

  const response = await safeFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    signal,
    body: JSON.stringify(buildOllamaBody(messages, config, true)),
  });
  if (!response.ok)
    throw new Error(
      cleanErrorText(await response.text(), response.status, response.statusText)
    );
  return response.body;
};
