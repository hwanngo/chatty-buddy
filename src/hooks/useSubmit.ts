import { v4 as uuidv4 } from 'uuid';
import useStore from '@store/store';
import { useTranslation } from 'react-i18next';
import type {
  ChatInterface,
  ConfigInterface,
  MessageInterface,
  TextContentInterface,
} from '@type/chat';
import { executeToolCall } from '@utils/tools';
import { splitThinking } from '@utils/thinking';
import {
  getChatCompletion,
  getChatCompletionStream,
  getAnthropicChatCompletion,
  getAnthropicChatCompletionStream,
  getOllamaChatCompletion,
  getOllamaChatCompletionStream,
} from '@api/api';
import { foldAnthropicContent } from '@api/helper';
import { limitMessageTokens, updateTotalTokenUsed } from '@utils/messageUtils';
import { officialAPIEndpoint } from '@constants/auth';
import {
  isModelsReady,
  modelMaxToken,
  modelOptions,
  modelStreamSupport,
} from '@constants/modelLoader';
import {
  startAbortController,
  clearAbortController,
  isActiveController,
  isAbortError,
} from '@utils/abortController';
import {
  MAX_TOOL_CALLS,
  readGenerationStream,
  updateGenerationMessage,
} from '@utils/generation';

const MAX_TOOL_ROUNDS = 3;
const emptyAssistant = (): MessageInterface => ({
  id: uuidv4(),
  role: 'assistant',
  generationStatus: 'streaming',
  content: [{ type: 'text', text: '' }],
});

const useSubmit = () => {
  const { t, i18n } = useTranslation('api');
  const error = useStore((state) => state.error);

  const handleSubmit = async () => {
    // Everything that defines the request is captured together. Changing the
    // endpoint or switching chats mid-request cannot redirect follow-up calls.
    const initial = useStore.getState();
    const chat = initial.chats?.[initial.currentChatIndex];
    if (initial.generating || !chat) return;
    const {
      apiEndpoint,
      apiKey,
      apiType,
      apiVersion,
      autoTitle,
      countTotalTokens,
    } = initial;
    if (!apiKey && apiEndpoint === officialAPIEndpoint) {
      initial.setError(t('noApiKeyWarning'));
      return;
    }
    const config = { ...chat.config };
    const preferredTitleModel = initial.titleModel ?? config.model;
    const titleModelUnavailable =
      isModelsReady &&
      modelOptions.length > 0 &&
      !modelOptions.includes(preferredTitleModel);
    // A preference survives endpoint switches. Only the effective model for
    // this request falls back when the loaded catalog establishes its absence.
    const titleModel = titleModelUnavailable
      ? config.model
      : preferredTitleModel;
    const titleLanguage = i18n.language;
    const chatId = chat.id;
    const controller = startAbortController();
    const signal = controller.signal;
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 300_000);
    let assistant = emptyAssistant();
    let messageId = assistant.id!;
    let buffered = '';
    let flushTimer: ReturnType<typeof setTimeout> | undefined;
    let unsubscribe: (() => void) | undefined;
    const patchMessage = (
      update: (message: MessageInterface) => MessageInterface
    ) => {
      const state = useStore.getState();
      if (
        !state.chats?.some(
          (item) =>
            item.id === chatId &&
            item.messages.some((message) => message.id === messageId)
        )
      )
        return;
      state.setChats(
        updateGenerationMessage(state.chats, chatId, messageId, update)
      );
    };
    const flush = () => {
      if (flushTimer) clearTimeout(flushTimer);
      flushTimer = undefined;
      if (!buffered) return;
      const text = buffered;
      buffered = '';
      patchMessage((message) => ({
        ...message,
        content: [
          {
            type: 'text',
            text:
              String((message.content[0] as TextContentInterface)?.text ?? '') +
              text,
          },
          ...message.content.slice(1),
        ],
      }));
    };
    const append = (text: string) => {
      buffered += text;
      if (!flushTimer)
        flushTimer = setTimeout(() => {
          try {
            flush();
          } catch (cause) {
            controller.abort(cause);
            useStore.getState().setError((cause as Error).message);
          }
        }, 50);
    };
    const inputBudget = Math.min(
      config.max_tokens,
      Math.max(
        1,
        (modelMaxToken[config.model] ??
          config.max_tokens + (config.output_tokens ?? 4096)) -
          (config.output_tokens ?? 4096)
      )
    );
    const requestOnce = async (
      messages: MessageInterface[],
      requestConfig: ConfigInterface
    ) => {
      signal.throwIfAborted();
      if (apiType === 'anthropic') {
        const data = await getAnthropicChatCompletion(
          apiEndpoint,
          messages,
          requestConfig,
          apiKey || undefined,
          signal
        );
        return { text: foldAnthropicContent(data.content), toolCalls: [] };
      }
      if (apiType === 'ollama') {
        const data = await getOllamaChatCompletion(
          apiEndpoint,
          messages,
          requestConfig,
          apiKey || undefined,
          signal
        );
        return {
          text: data.message?.thinking
            ? `<think>${data.message.thinking}</think>${data.message.content ?? ''}`
            : (data.message?.content ?? ''),
          toolCalls: (data.message?.tool_calls ?? []).map(
            (call: {
              id?: string;
              function: { name: string; arguments: unknown };
            }) => ({
              id: call.id ?? uuidv4(),
              type: 'function' as const,
              function: {
                name: call.function.name,
                arguments:
                  typeof call.function.arguments === 'string'
                    ? call.function.arguments
                    : JSON.stringify(call.function.arguments ?? {}),
              },
            })
          ),
        };
      }
      const data = await getChatCompletion(
        apiEndpoint,
        messages,
        requestConfig,
        apiKey || undefined,
        undefined,
        apiVersion,
        signal
      );
      return {
        text: data.choices?.[0]?.message?.content ?? '',
        toolCalls: data.choices?.[0]?.message?.tool_calls ?? [],
      };
    };
    try {
      const messages = limitMessageTokens(
        chat.messages,
        inputBudget,
        config.model,
        true
      );
      initial.setError('');
      initial.setGenerating(true);
      initial.setChats(
        initial.chats!.map((item): ChatInterface =>
          item.id === chatId
            ? { ...item, messages: [...item.messages, assistant] }
            : item
        )
      );
      unsubscribe = useStore.subscribe((state) => {
        if (
          !state.chats?.some(
            (item) =>
              item.id === chatId &&
              item.messages.some((message) => message.id === messageId)
          )
        ) {
          controller.abort();
        }
      });
      let roundMessages = messages;
      const streaming =
        apiType !== 'openai' || modelStreamSupport[config.model] !== false;
      for (let round = 0; ; round++) {
        signal.throwIfAborted();
        const sent = limitMessageTokens(
          roundMessages,
          inputBudget,
          config.model,
          true
        );
        let result;
        if (streaming) {
          let stream: ReadableStream<Uint8Array> | null;
          if (apiType === 'anthropic') {
            stream = await getAnthropicChatCompletionStream(
              apiEndpoint,
              sent,
              config,
              apiKey || undefined,
              signal
            );
          } else if (apiType === 'ollama') {
            stream = await getOllamaChatCompletionStream(
              apiEndpoint,
              sent,
              config,
              apiKey || undefined,
              signal
            );
          } else {
            stream = await getChatCompletionStream(
              apiEndpoint,
              sent,
              config,
              apiKey || undefined,
              undefined,
              apiVersion,
              signal
            );
          }
          result = await readGenerationStream(stream, apiType, signal, append);
        } else {
          result = await requestOnce(sent, config);
          if (
            typeof result.text !== 'string' ||
            (!result.text && !result.toolCalls.length)
          )
            throw new Error(t('errors.failedToRetrieveData'));
          append(result.text);
        }
        if (!result.text && !result.toolCalls.length)
          throw new Error(t('errors.failedToRetrieveData'));
        flush();
        signal.throwIfAborted();
        if (countTotalTokens)
          updateTotalTokenUsed(config.model, sent, {
            role: 'assistant',
            content: [{ type: 'text', text: result.text }],
            ...(result.toolCalls.length
              ? { tool_calls: result.toolCalls }
              : {}),
          });
        const requested = result.toolCalls;
        if (!requested.length) {
          patchMessage((message) => ({
            ...message,
            generationStatus: 'complete',
          }));
          break;
        }
        if (!config.fetchUrl || apiType === 'anthropic')
          throw new Error(
            'The model requested a tool that is disabled for this request.'
          );
        if (
          requested.length > MAX_TOOL_CALLS ||
          new Set(requested.map((call: { id: string }) => call.id)).size !==
            requested.length ||
          requested.some(
            (call: {
              id?: string;
              function?: { name: string; arguments: string };
            }) =>
              !call.id ||
              call.function?.name !== 'fetch_url' ||
              typeof call.function.arguments !== 'string' ||
              call.function.arguments.length > 32768
          )
        ) {
          throw new Error(
            'The model requested an unsupported or invalid tool call.'
          );
        }
        if (round >= MAX_TOOL_ROUNDS)
          throw new Error(
            t('errors.toolRoundLimit', { count: MAX_TOOL_ROUNDS })
          );
        const toolMessages: MessageInterface[] = [];
        for (const call of requested) {
          signal.throwIfAborted();
          const result = await executeToolCall(
            call,
            signal,
            config.fetchUrl === true
          );
          toolMessages.push({
            id: uuidv4(),
            role: 'tool',
            tool_call_id: call.id,
            tool_name: result.label,
            content: [{ type: 'text', text: result.content }],
          });
        }
        signal.throwIfAborted();
        const assistantWithCalls: MessageInterface = {
          ...assistant,
          content: [{ type: 'text', text: result.text }],
          tool_calls: requested,
          generationStatus: 'complete',
        };
        roundMessages = [...sent, assistantWithCalls, ...toolMessages];
        const previousId = messageId;
        assistant = emptyAssistant();
        messageId = assistant.id!;
        const state = useStore.getState();
        state.setChats(
          (state.chats ?? []).map((item) => {
            if (item.id !== chatId) return item;
            const index = item.messages.findIndex(
              (message) => message.id === previousId
            );
            if (index < 0) return item;
            const messages = item.messages.slice();
            messages.splice(
              index,
              1,
              assistantWithCalls,
              ...toolMessages,
              assistant
            );
            return { ...item, messages };
          })
        );
      }
      signal.throwIfAborted();
      const currentChat = useStore
        .getState()
        .chats?.find((item) => item.id === chatId);
      if (autoTitle && currentChat && !currentChat.titleSet) {
        const source = [...currentChat.messages]
          .reverse()
          .find((message) => message.role === 'user');
        const answer = currentChat.messages.find(
          (message) => message.id === messageId
        );
        if (source && answer) {
          try {
            const titleMessage: MessageInterface = {
              role: 'user',
              content: [
                ...source.content.filter((part) => part.type === 'text'),
                ...answer.content.filter((part) => part.type === 'text'),
                {
                  type: 'text',
                  text: `Generate a title in less than 6 words (language: ${titleLanguage}). Return only the title.`,
                },
              ],
            };
            if (titleModelUnavailable) {
              useStore.getState().addToast(
                'warning',
                t('errors.titleModelUnavailable', {
                  defaultValue:
                    'Selected title model unavailable; using conversation model ({{model}}).',
                  model: titleModel,
                })
              );
            }
            const titleConfig = {
              ...config,
              model: titleModel,
              think: false,
              fetchUrl: false,
              webSearch: false,
              output_tokens: 128,
            };
            // Use a bounded excerpt for titles; title generation must never
            // turn a successful long answer into a failed chat request.
            titleMessage.content = [
              {
                type: 'text',
                text: titleMessage.content
                  .map((part) => String(part.text ?? ''))
                  .join('\n')
                  .slice(-3000),
              },
            ];
            const titleInput = limitMessageTokens(
              [titleMessage],
              Math.min(4096, inputBudget),
              titleModel,
              true
            );
            const { text: rawTitle } = await requestOnce(
              titleInput,
              titleConfig
            );
            signal.throwIfAborted();
            // Some local models reason despite the title configuration. Never
            // let that reasoning become a conversation's name.
            const title = splitThinking(String(rawTitle ?? ''))
              .answer.trim()
              .replace(/^"|"$/g, '')
              .slice(0, 160);
            if (title) {
              const state = useStore.getState();
              state.setChats(
                (state.chats ?? []).map((item) =>
                  item.id === chatId && !item.titleSet
                    ? { ...item, title, titleSet: true }
                    : item
                )
              );
              if (countTotalTokens)
                updateTotalTokenUsed(titleModel, titleInput, {
                  role: 'assistant',
                  content: [{ type: 'text', text: String(rawTitle) }],
                });
            }
          } catch (cause) {
            if (!signal.aborted)
              useStore
                .getState()
                .addToast(
                  'warning',
                  `The answer was saved, but its title could not be generated: ${(cause as Error).message}`
                );
          }
        }
      }
    } catch (cause) {
      const cancelled =
        signal.aborted && !timedOut && isAbortError(signal.reason);
      let message = (cause as Error).message;
      if (timedOut)
        message =
          'The generation timed out after five minutes. Retry or shorten the request.';
      try {
        flush();
        patchMessage((previous) => ({
          ...previous,
          generationStatus: cancelled ? 'cancelled' : 'failed',
          generationError: cancelled ? undefined : message,
        }));
      } catch (storageError) {
        // A full storage device can also prevent persisting the failure flag.
        // Runtime-only error state still gives the user a recovery message.
        message = (storageError as Error).message;
      }
      if (!cancelled) useStore.getState().setError(message);
    } finally {
      clearTimeout(timeout);
      unsubscribe?.();
      try {
        flush();
      } catch (cause) {
        useStore.getState().setError((cause as Error).message);
      }
      if (isActiveController(controller)) {
        clearAbortController(controller);
        useStore.getState().setGenerating(false);
      }
    }
  };
  return { handleSubmit, error };
};

export default useSubmit;
