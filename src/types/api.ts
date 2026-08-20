export interface EventSourceDataInterface {
  choices: EventSourceDataChoices[];
  created: number;
  id: string;
  model: string;
  object: string;
}

export type EventSourceData = EventSourceDataInterface | '[DONE]';

export interface EventSourceDataChoices {
  delta: {
    content?: string;
    role?: string;
    /**
     * Reasoning streamed in a field of its own rather than inline in
     * `content`. Two spellings are in circulation for the same thing:
     * `reasoning` (OpenRouter) and `reasoning_content` (DeepSeek, and Qwen
     * served via vLLM). Local runtimes generally don't use either — they emit
     * `<think>` tags inside `content` instead.
     */
    reasoning?: string;
    reasoning_content?: string;
    /**
     * Tool calls arrive in fragments across chunks: `index` identifies which
     * call a fragment belongs to, `id`/`name` appear once, and `arguments`
     * accumulates. Every field is optional because any chunk may carry only
     * part of one.
     */
    tool_calls?: {
      index?: number;
      id?: string;
      type?: 'function';
      function?: { name?: string; arguments?: string };
    }[];
  };
  finish_reason?: string;
  index: number;
}

// ─── Anthropic-compatible API types ───────────────────────────────────────────

export interface AnthropicTextBlock {
  type: 'text';
  text: string;
}

/**
 * Extended-thinking block. Anthropic emits these only when the request asks
 * for thinking, but Anthropic-compatible local servers (llama.cpp's
 * `/v1/messages`, and the proxies in front of it) emit them for any reasoning
 * model, unasked.
 */
export interface AnthropicThinkingBlock {
  type: 'thinking';
  thinking: string;
  signature?: string;
}

export type AnthropicContentBlock = AnthropicTextBlock | AnthropicThinkingBlock;

/** Shape returned by POST /v1/messages (non-streaming) */
export interface AnthropicMessage {
  id: string;
  type: 'message';
  role: 'assistant';
  content: AnthropicContentBlock[];
  model: string;
  stop_reason: string | null;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/** Single event from the Anthropic SSE stream carrying text or reasoning */
export interface AnthropicStreamContentBlockDelta {
  type: 'content_block_delta';
  index: number;
  delta:
    | { type: 'text_delta'; text: string }
    | { type: 'thinking_delta'; thinking: string };
}

// ─── Ollama native API types ──────────────────────────────────────────────────

/**
 * One line of an ollama `/api/chat` stream. The native protocol is
 * newline-delimited JSON rather than SSE: no `data:` prefix, no `[DONE]`
 * sentinel, and — unlike the OpenAI shim — tool calls arrive complete in a
 * single object instead of as fragments to be reassembled by index.
 */
export interface OllamaStreamChunk {
  model?: string;
  created_at?: string;
  message?: OllamaMessage;
  done?: boolean;
  error?: string;
}

export interface OllamaMessage {
  role: string;
  content?: string;
  /** Reasoning, in its own field, when `think` is enabled. */
  thinking?: string;
  tool_calls?: OllamaToolCall[];
}

export interface OllamaToolCall {
  id?: string;
  function: {
    index?: number;
    name: string;
    /** An object, not a JSON string — the reverse of the OpenAI shape. */
    arguments: Record<string, unknown> | string;
  };
}
