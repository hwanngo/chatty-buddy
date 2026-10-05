import useStore from '@store/store';

import { Tiktoken } from '@dqbd/tiktoken/lite';
import {
  isImageContent,
  isTextContent,
  MessageInterface,
  TotalTokenUsed,
} from '@type/chat';
import { ModelOptions } from './modelReader';
const cl100k_base = await import('@dqbd/tiktoken/encoders/cl100k_base.json');

const encoder = new Tiktoken(
  cl100k_base.bpe_ranks,
  {
    ...cl100k_base.special_tokens,
    '<|im_start|>': 100264,
    '<|im_end|>': 100265,
    '<|im_sep|>': 100266,
  },
  cl100k_base.pat_str
);

// https://github.com/dqbd/tiktoken/issues/23#issuecomment-1483317174
export const getChatGPTEncoding = (
  messages: MessageInterface[],
  model: ModelOptions
) => {
  const isGpt3 = model === 'gpt-3.5-turbo';

  const msgSep = isGpt3 ? '\n' : '';
  const roleSep = isGpt3 ? '\n' : '<|im_sep|>';

  const serialized = [
    messages
      .map(({ role, content, tool_calls, tool_call_id }) => {
        const text =
          content
            .filter(isTextContent)
            .map((part) => part.text)
            .join('\n') +
          (tool_calls ? JSON.stringify(tool_calls) : '') +
          (tool_call_id ?? '');
        return `<|im_start|>${role}${roleSep}${text}<|im_end|>`;
      })
      .join(msgSep),
    `<|im_start|>assistant${roleSep}`,
  ].join(msgSep);

  return encoder.encode(serialized, 'all');
};

// Generation structurally shares historical messages. Cache their estimates
// without retaining deleted chats; each streamed replacement is a fresh key.
const messageTokenCache = new WeakMap<
  MessageInterface,
  Map<ModelOptions, number>
>();
const framingTokens = (model: ModelOptions) =>
  getChatGPTEncoding([], model).length;
const countTokens = (
  messages: MessageInterface[],
  model: ModelOptions
): number => {
  if (!messages || messages.length === 0) return 0;
  const framing = framingTokens(model);
  return (
    framing +
    messages.reduce((total, message) => {
      let models = messageTokenCache.get(message);
      if (!models) {
        models = new Map();
        messageTokenCache.set(message, models);
      }
      let tokens = models.get(model);
      if (tokens === undefined) {
        tokens =
          getChatGPTEncoding([message], model).length -
          framing +
          message.content.filter(isImageContent).length * 1024;
        // Switching models should not grow a long-lived message's cache forever.
        if (models.size >= 4) models.clear();
        models.set(model, tokens);
      }
      return total + tokens;
    }, 0)
  );
};

export const limitMessageTokens = (
  messages: MessageInterface[],
  limit: number = 4096,
  model: ModelOptions,
  requireLatest = false
): MessageInterface[] => {
  if (!Number.isFinite(limit) || limit <= 0)
    throw new Error('Invalid input token budget.');
  const limitedMessages: MessageInterface[] = [];
  let tokenCount = 0;

  // Pin a leading system prompt: reserve its tokens up front so it survives
  // when older history is trimmed, instead of being the first thing evicted.
  const isSystemFirstMessage = messages[0]?.role === 'system';
  let retainSystemMessage = false;
  if (isSystemFirstMessage) {
    const systemTokenCount = countTokens([messages[0]], model);
    if (systemTokenCount < limit) {
      tokenCount += systemTokenCount;
      retainSystemMessage = true;
    }
  }

  // Walk the rest of the history newest-first until the budget is spent,
  // skipping the pinned system message (index 0) so it isn't double-counted.
  const lowerBound = isSystemFirstMessage ? 1 : 0;
  for (let i = messages.length - 1; i >= lowerBound; i--) {
    const count = countTokens([messages[i]], model);
    if (count + tokenCount > limit) break;
    tokenCount += count;
    limitedMessages.unshift(messages[i]);
  }

  // Trimming walks backwards, so it can cut between an assistant message that
  // requested a tool and the `tool` message answering it — leaving a result
  // with nothing to attach to. Providers reject that outright ("tool message
  // must be a response to a preceding tool_calls"), so drop any leading
  // orphans before they reach the API.
  while (limitedMessages.length > 0 && limitedMessages[0].role === 'tool') {
    limitedMessages.shift();
  }

  // Restore the system prompt at the front of whatever history fit.
  if (retainSystemMessage) {
    limitedMessages.unshift(messages[0]);
  }

  if (
    requireLatest &&
    (messages.length === 0 ||
      !limitedMessages.includes(messages[messages.length - 1]) ||
      (isSystemFirstMessage && !retainSystemMessage))
  ) {
    throw new Error(
      'The latest message and system prompt exceed the input token budget. Shorten them or increase the budget.'
    );
  }
  return limitedMessages;
};

export const updateTotalTokenUsed = (
  model: ModelOptions,
  promptMessages: MessageInterface[],
  completionMessage: MessageInterface
) => {
  const setTotalTokenUsed = useStore.getState().setTotalTokenUsed;
  const updatedTotalTokenUsed: TotalTokenUsed = JSON.parse(
    JSON.stringify(useStore.getState().totalTokenUsed)
  );

  // Estimates cover the actual request history (all text blocks and tool
  // payloads). Image counts mark cost as unknown; they are not text tokens.
  const newPromptTokens = getChatGPTEncoding(promptMessages, model).length;
  const newImageTokens = promptMessages.reduce(
    (sum, message) => sum + message.content.filter(isImageContent).length,
    0
  );
  const newCompletionTokens = getChatGPTEncoding(
    [completionMessage],
    model
  ).length;

  // Destructure existing token counts or default to 0
  const {
    promptTokens = 0,
    completionTokens = 0,
    imageTokens = 0,
  } = updatedTotalTokenUsed[model] ?? {};

  // Update token counts
  updatedTotalTokenUsed[model] = {
    promptTokens: promptTokens + newPromptTokens,
    completionTokens: completionTokens + newCompletionTokens,
    imageTokens: imageTokens + newImageTokens,
  };

  // Set the updated token counts in the store
  setTotalTokenUsed(updatedTotalTokenUsed);
};

export default countTokens;
