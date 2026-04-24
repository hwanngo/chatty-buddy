import { AnthropicStreamContentBlockDelta, EventSourceData } from '@type/api';

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
 * Parses a raw Anthropic SSE buffer into text chunks and a done flag.
 *
 * Returns:
 *   chunks — all content_block_delta text deltas found in this buffer
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
        if (parsed?.delta?.type === 'text_delta') {
          chunks.push(parsed);
        }
      } catch {
        // ignore malformed JSON — stream continues
      }
    }
  }

  return { chunks, done };
};
