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
  };
  finish_reason?: string;
  index: number;
}

// ─── Anthropic-compatible API types ───────────────────────────────────────────

export interface AnthropicTextBlock {
  type: 'text';
  text: string;
}

/** Shape returned by POST /v1/messages (non-streaming) */
export interface AnthropicMessage {
  id: string;
  type: 'message';
  role: 'assistant';
  content: AnthropicTextBlock[];
  model: string;
  stop_reason: string | null;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/** Single event from the Anthropic SSE stream with text content */
export interface AnthropicStreamContentBlockDelta {
  type: 'content_block_delta';
  index: number;
  delta: {
    type: 'text_delta';
    text: string;
  };
}
