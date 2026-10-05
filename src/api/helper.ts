// Type-only: these are erased at build time, and writing it explicitly keeps
// this module free of runtime imports so its parsers can be exercised alone.
import type {
  AnthropicContentBlock,
  AnthropicStreamContentBlockDelta,
  EventSourceData,
  OllamaStreamChunk,
} from '@type/api';

/** Parse complete SSE records, ignoring comments and non-data fields. */
export const parseSseRecords = (
  data: string
): { event: string; data: string }[] =>
  data
    .replace(/\r\n|\r/g, '\n')
    .split('\n\n')
    .flatMap((record) => {
      let event = '';
      const values: string[] = [];
      for (const line of record.split('\n')) {
        if (line.startsWith(':')) continue;
        const colon = line.indexOf(':');
        const field = colon < 0 ? line : line.slice(0, colon);
        const value = colon < 0 ? '' : line.slice(colon + 1).replace(/^ /, '');
        if (field === 'event') event = value;
        if (field === 'data') values.push(value);
      }
      return values.length ? [{ event, data: values.join('\n') }] : [];
    });

export const parseEventSource = (data: string): EventSourceData[] =>
  parseSseRecords(data).map((record) => {
    if (record.data === '[DONE]') return '[DONE]';
    const parsed = JSON.parse(record.data);
    if (parsed.error)
      throw new Error(parsed.error.message ?? String(parsed.error));
    return parsed;
  });

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
 * The caller buffers incomplete records. Malformed complete events and
 * provider errors throw instead of silently turning a failed stream into success.
 */
export const parseAnthropicEventSource = (
  data: string
): { chunks: AnthropicStreamContentBlockDelta[]; done: boolean } => {
  const chunks: AnthropicStreamContentBlockDelta[] = [];
  let done = false;
  for (const record of parseSseRecords(data)) {
    const parsed = JSON.parse(record.data);
    const event = record.event || parsed.type;
    if (event === 'error' || parsed.error) {
      throw new Error(
        parsed.error?.message ?? 'The provider reported a streaming error.'
      );
    }
    if (event === 'message_stop') done = true;
    if (
      event === 'content_block_delta' &&
      (parsed.delta?.type === 'text_delta' ||
        parsed.delta?.type === 'thinking_delta')
    ) {
      chunks.push(parsed);
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
      // The caller hands over complete lines, so malformed JSON is a
      // protocol error as well as an explicit provider error.
      throw e;
    }
  }

  return { chunks, done };
};
