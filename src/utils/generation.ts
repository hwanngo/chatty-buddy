import { v4 as uuidv4 } from 'uuid';
import type {
  ChatInterface,
  MessageInterface,
  ToolCallInterface,
} from '@type/chat';
import {
  parseAnthropicEventSource,
  parseEventSource,
  parseOllamaStream,
} from '@api/helper';

export const MAX_TOOL_CALLS = 4;
const MAX_BUFFER_CHARS = 1_000_000;
const MAX_ARGUMENT_CHARS = 32_768;

/** Update only the identified chat/message. Deleted targets are never recreated. */
export const updateGenerationMessage = (
  chats: ChatInterface[],
  chatId: string,
  messageId: string,
  update: (message: MessageInterface) => MessageInterface
): ChatInterface[] =>
  chats.map((chat) => {
    if (chat.id !== chatId) return chat;
    const at = chat.messages.findIndex((message) => message.id === messageId);
    if (at < 0) return chat;
    const messages = chat.messages.slice();
    messages[at] = update(messages[at]);
    return { ...chat, messages };
  });

export interface StreamResult {
  text: string;
  toolCalls: ToolCallInterface[];
}

/** One decoder per response preserves multibyte characters split across reads. */
export const readGenerationStream = async (
  stream: ReadableStream<Uint8Array> | null,
  protocol: 'openai' | 'anthropic' | 'ollama',
  signal: AbortSignal,
  append: (text: string) => void
): Promise<StreamResult> => {
  if (!stream) throw new Error('The endpoint returned no response body.');
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  let trailingCR = '';
  let complete = false;
  let reasoning = false;
  let text = '';
  const calls: ToolCallInterface[] = [];
  const write = (value: string) => {
    if (text.length + value.length > 4_000_000)
      throw new Error('The response exceeded the size limit.');
    text += value;
    append(value);
  };
  const delta = (thinking?: string, content?: string) => {
    if (thinking) {
      if (!reasoning) {
        write('<think>');
        reasoning = true;
      }
      write(thinking);
    }
    if (content) {
      if (reasoning) {
        write('</think>');
        reasoning = false;
      }
      write(content);
    }
  };
  const cancel = () => {
    void reader.cancel(signal.reason).catch(() => undefined);
  };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    while (!complete) {
      signal.throwIfAborted();
      const { done, value } = await reader.read();
      signal.throwIfAborted();
      let decoded = trailingCR + decoder.decode(value, { stream: !done });
      trailingCR = !done && decoded.endsWith('\r') ? '\r' : '';
      if (trailingCR) decoded = decoded.slice(0, -1);
      pending += decoded.replace(/\r\n|\r/g, '\n');
      if (pending.length > MAX_BUFFER_CHARS)
        throw new Error('Stream event exceeded the size limit.');
      const boundary = protocol === 'ollama' ? '\n' : '\n\n';
      const last = pending.lastIndexOf(boundary);
      const batch = done
        ? pending
        : last < 0
          ? ''
          : pending.slice(0, last + boundary.length);
      pending = done
        ? ''
        : last < 0
          ? pending
          : pending.slice(last + boundary.length);
      if (protocol === 'anthropic') {
        const parsed = parseAnthropicEventSource(batch);
        complete = parsed.done;
        for (const chunk of parsed.chunks) {
          if (chunk.delta.type === 'thinking_delta')
            delta(chunk.delta.thinking);
          else delta(undefined, chunk.delta.text);
        }
      } else if (protocol === 'ollama') {
        const parsed = parseOllamaStream(batch);
        complete = parsed.done;
        for (const chunk of parsed.chunks) {
          delta(chunk.message?.thinking, chunk.message?.content);
          for (const call of chunk.message?.tool_calls ?? []) {
            calls.push({
              id: call.id ?? uuidv4(),
              type: 'function',
              function: {
                name: call.function.name,
                arguments:
                  typeof call.function.arguments === 'string'
                    ? call.function.arguments
                    : JSON.stringify(call.function.arguments ?? {}),
              },
            });
          }
        }
      } else {
        for (const event of parseEventSource(batch)) {
          if (event === '[DONE]') {
            complete = true;
            continue;
          }
          const choice = event.choices?.[0];
          if (choice?.finish_reason) complete = true;
          const part = choice?.delta;
          if (!part) continue;
          delta(part.reasoning ?? part.reasoning_content, part.content);
          for (const fragment of part.tool_calls ?? []) {
            const index = fragment.index ?? 0;
            if (
              !Number.isInteger(index) ||
              index < 0 ||
              index >= MAX_TOOL_CALLS
            ) {
              throw new Error('The model exceeded the tool-call limit.');
            }
            const call = (calls[index] ??= {
              id: '',
              type: 'function',
              function: { name: '', arguments: '' },
            });
            if (fragment.id) call.id = fragment.id;
            if (fragment.function?.name)
              call.function.name = fragment.function.name;
            if (fragment.function?.arguments)
              call.function.arguments += fragment.function.arguments;
          }
        }
      }
      if (
        calls.length > MAX_TOOL_CALLS ||
        calls.some(
          (call) => call && call.function.arguments.length > MAX_ARGUMENT_CHARS
        )
      ) {
        throw new Error('The model exceeded the tool-call size limit.');
      }
      if (done && !complete)
        throw new Error(
          'The response ended before the provider confirmed completion. Retry to continue.'
        );
    }
    return {
      text: reasoning ? text + '</think>' : text,
      toolCalls: calls.filter(Boolean),
    };
  } finally {
    signal.removeEventListener('abort', cancel);
    try {
      if (reasoning) append('</think>');
    } finally {
      try {
        await reader.cancel();
      } catch {
        /* Preserve the original stream error. */
      } finally {
        reader.releaseLock();
      }
    }
  }
};
