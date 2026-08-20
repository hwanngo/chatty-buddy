// Type-only: these are erased at build time, and writing it explicitly keeps
// this module free of runtime imports so its parsers can be exercised alone.
import type {
  AnthropicContentBlock,
  AnthropicStreamContentBlockDelta,
  EventSourceData,
  OllamaStreamChunk,
} from '@type/api';

export const parseEventSource = (
  data: string
): '[DONE]' | EventSourceData[] => {
  const result = data
    .split('\n\n')
    .filter(Boolean)
    .map((chunk) => {
      const jsonString = chunk
        .split('\n')
        .map((line) => line.replace(/^data: /, ''))
        .join('');
      if (jsonString === '[DONE]') return jsonString;
      try {
        const json = JSON.parse(jsonString);
        return json;
      } catch {
        return jsonString;
      }
    });
  return result;
};

export const createMultipartRelatedBody = (
  metadata: object,
  file: File,
  boundary: string
): Blob => {
  const encoder = new TextEncoder();

  const metadataPart = encoder.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
      metadata
    )}\r\n`
  );
  const filePart = encoder.encode(
    `--${boundary}\r\nContent-Type: ${file.type}\r\n\r\n`
  );
  const endBoundary = encoder.encode(`\r\n--${boundary}--`);

  return new Blob([metadataPart, filePart, file, endBoundary], {
    type: 'multipart/related; boundary=' + boundary,
  });
};

/**
 * Folds a non-streaming Anthropic content array into our single text string.
 *
 * Reasoning becomes a `<think>` block so it takes the same path as every other
 * provider; anything that is neither text nor thinking (a tool_use block, a
 * future block type) is dropped rather than rendered as `undefined`.
 */
export const foldAnthropicContent = (
  content: AnthropicContentBlock[] | undefined
): string => {
  let thinking = '';
  let text = '';
  for (const block of content ?? []) {
    if (block.type === 'thinking') thinking += block.thinking;
    else if (block.type === 'text') text += block.text;
  }
  return thinking ? `<think>${thinking}</think>${text}` : text;
};

/**
 * Parses a raw Anthropic SSE buffer into content chunks and a done flag.
 *
 * Returns:
 *   chunks — all content_block_delta text *and* thinking deltas found in this
 *            buffer, in arrival order; the caller folds thinking into `<think>`
 *   done   — true when a `message_stop` event is present
 *
 * Partial event data (buffer cut mid-event) is silently skipped; the caller
 * must prepend its saved `partial` string from the previous iteration.
 */
export const parseAnthropicEventSource = (
  data: string
): { chunks: AnthropicStreamContentBlockDelta[]; done: boolean } => {
  const events = data.split('\n\n').filter(Boolean);
  const chunks: AnthropicStreamContentBlockDelta[] = [];
  let done = false;

  for (const event of events) {
    const lines = event.split('\n');
    let eventType = '';
    let dataLine = '';

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        eventType = line.slice(7).trim();
      } else if (line.startsWith('data: ')) {
        dataLine = line.slice(6).trim();
      }
    }

    if (eventType === 'message_stop') {
      done = true;
    } else if (eventType === 'content_block_delta' && dataLine) {
      try {
        const parsed = JSON.parse(dataLine) as AnthropicStreamContentBlockDelta;
        // `signature_delta` and `input_json_delta` are deliberately not kept:
        // one is a cryptographic signature over the reasoning, the other is a
        // tool argument fragment, and neither is content to display.
        if (
          parsed?.delta?.type === 'text_delta' ||
          parsed?.delta?.type === 'thinking_delta'
        ) {
          chunks.push(parsed);
        }
      } catch {
        // ignore malformed JSON — stream continues
      }
    }
  }

  return { chunks, done };
};

/**
 * Parses a raw ollama `/api/chat` buffer into chunks and a done flag.
 *
 * The native protocol is newline-delimited JSON, which is simpler than SSE in
 * every way that mattered for the OpenAI path: one complete object per line,
 * no `data:` prefix, no `[DONE]` sentinel, and tool calls arriving whole
 * rather than as fragments to reassemble.
 *
 * The caller is responsible for holding back a trailing partial line between
 * reads; only whole lines should be passed in.
 */
export const parseOllamaStream = (
  data: string
): { chunks: OllamaStreamChunk[]; done: boolean } => {
  const chunks: OllamaStreamChunk[] = [];
  let done = false;

  for (const line of data.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as OllamaStreamChunk;
      // The server reports failures in-band, mid-stream, with a 200 status.
      if (parsed.error) throw new Error(parsed.error);
      chunks.push(parsed);
      if (parsed.done) done = true;
    } catch (e) {
      // A genuine server error must surface; malformed JSON is a torn line
      // and is simply skipped, matching the SSE parsers above.
      if (e instanceof Error && !(e instanceof SyntaxError)) throw e;
    }
  }

  return { chunks, done };
};
