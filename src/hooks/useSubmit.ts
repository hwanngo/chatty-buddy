import useStore from '@store/store';
import { useTranslation } from 'react-i18next';
import {
  ChatInterface,
  ConfigInterface,
  MessageInterface,
  TextContentInterface,
} from '@type/chat';
import {
  getChatCompletion,
  getChatCompletionStream,
  getAnthropicChatCompletion,
  getAnthropicChatCompletionStream,
} from '@api/api';
import { parseEventSource, parseAnthropicEventSource } from '@api/helper';
import { limitMessageTokens, updateTotalTokenUsed } from '@utils/messageUtils';
import { _defaultChatConfig } from '@constants/chat';
import { officialAPIEndpoint } from '@constants/auth';
import { modelStreamSupport } from '@constants/modelLoader';

const useSubmit = () => {
  const { t, i18n } = useTranslation('api');
  const error = useStore((state) => state.error);
  const setError = useStore((state) => state.setError);
  const apiEndpoint = useStore((state) => state.apiEndpoint);
  const apiKey = useStore((state) => state.apiKey);
  const apiType = useStore((state) => state.apiType);
  const setGenerating = useStore((state) => state.setGenerating);
  const generating = useStore((state) => state.generating);
  const currentChatIndex = useStore((state) => state.currentChatIndex);
  const setChats = useStore((state) => state.setChats);

  const generateTitle = async (
    message: MessageInterface[],
    modelConfig: ConfigInterface
  ): Promise<string> => {
    try {
      // ── Anthropic-compatible path ──────────────────────────────────────
      if (apiType === 'anthropic') {
        const titleChatConfig = {
          ...modelConfig,
          model: useStore.getState().titleModel ?? modelConfig.model,
        };
        const data = await getAnthropicChatCompletion(
          useStore.getState().apiEndpoint,
          message,
          titleChatConfig,
          useStore.getState().apiKey || undefined
        );
        const titleText = data.content[0]?.text;
        if (!titleText)
          throw new Error(t('errors.failedToRetrieveData') as string);
        return titleText;
      }

      // ── OpenAI-compatible path (unchanged) ────────────────────────────
      let data;
      if (!apiKey || apiKey.length === 0) {
        if (apiEndpoint === officialAPIEndpoint) {
          throw new Error(t('noApiKeyWarning') as string);
        }
        const titleChatConfig = {
          ..._defaultChatConfig,
          model: useStore.getState().titleModel ?? _defaultChatConfig.model,
        };
        data = await getChatCompletion(
          useStore.getState().apiEndpoint,
          message,
          titleChatConfig,
          undefined,
          undefined,
          useStore.getState().apiVersion
        );
      } else if (apiKey) {
        const titleChatConfig = {
          ...modelConfig,
          model: useStore.getState().titleModel ?? modelConfig.model,
        };
        data = await getChatCompletion(
          useStore.getState().apiEndpoint,
          message,
          titleChatConfig,
          apiKey,
          undefined,
          useStore.getState().apiVersion
        );
      }
      return data.choices[0].message.content;
    } catch (error: unknown) {
      throw new Error(
        `${t('errors.errorGeneratingTitle')}\n${(error as Error).message}`
      );
    }
  };

  const handleSubmit = async () => {
    const chats = useStore.getState().chats;
    if (generating || !chats) return;

    if (
      (!apiKey || apiKey.length === 0) &&
      apiEndpoint === officialAPIEndpoint
    ) {
      setError(t('noApiKeyWarning') as string);
      return;
    }

    const updatedChats: ChatInterface[] = JSON.parse(JSON.stringify(chats));

    updatedChats[currentChatIndex].messages.push({
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: '',
        } as TextContentInterface,
      ],
    });

    setChats(updatedChats);
    setGenerating(true);

    try {
      // Anthropic always supports streaming; unknown OpenAI models default to non-streaming
      const isStreamSupported =
        apiType === 'anthropic'
          ? true
          : modelStreamSupport[chats[currentChatIndex].config.model];

      const { model, temperature, max_tokens } = chats[currentChatIndex].config;
      console.log('[useSubmit] Model streaming support:', {
        model,
        isStreamSupported,
        apiType,
      });

      let data;
      let stream;

      if (chats[currentChatIndex].messages.length === 0)
        throw new Error(t('errors.noMessagesSubmitted') as string);

      const messages = limitMessageTokens(
        chats[currentChatIndex].messages,
        chats[currentChatIndex].config.max_tokens,
        chats[currentChatIndex].config.model
      );
      if (messages.length === 0)
        throw new Error(t('errors.messageExceedMaxToken') as string);

      if (!isStreamSupported) {
        // ── Non-streaming branch ──────────────────────────────────────────
        if (apiType === 'anthropic') {
          // isStreamSupported is always true for Anthropic, so this is a safety fallback
          data = await getAnthropicChatCompletion(
            useStore.getState().apiEndpoint,
            messages,
            chats[currentChatIndex].config,
            apiKey || undefined
          );
          if (!data?.content?.[0]?.text) {
            throw new Error(t('errors.failedToRetrieveData') as string);
          }
          const updatedChats: ChatInterface[] = JSON.parse(
            JSON.stringify(useStore.getState().chats)
          );
          const updatedMessages = updatedChats[currentChatIndex].messages;
          (
            updatedMessages[updatedMessages.length - 1]
              .content[0] as TextContentInterface
          ).text += data.content[0].text;
          setChats(updatedChats);
        } else {
          // OpenAI non-streaming (unchanged)
          if (!apiKey || apiKey.length === 0) {
            if (apiEndpoint === officialAPIEndpoint) {
              throw new Error(t('noApiKeyWarning') as string);
            }
            data = await getChatCompletion(
              useStore.getState().apiEndpoint,
              messages,
              chats[currentChatIndex].config,
              undefined,
              undefined,
              useStore.getState().apiVersion
            );
          } else if (apiKey) {
            data = await getChatCompletion(
              useStore.getState().apiEndpoint,
              messages,
              chats[currentChatIndex].config,
              apiKey,
              undefined,
              useStore.getState().apiVersion
            );
          }

          if (
            !data ||
            !data.choices ||
            !data.choices[0] ||
            !data.choices[0].message ||
            !data.choices[0].message.content
          ) {
            throw new Error(t('errors.failedToRetrieveData') as string);
          }

          const updatedChats: ChatInterface[] = JSON.parse(
            JSON.stringify(useStore.getState().chats)
          );
          const updatedMessages = updatedChats[currentChatIndex].messages;
          (
            updatedMessages[updatedMessages.length - 1]
              .content[0] as TextContentInterface
          ).text += data.choices[0].message.content;
          setChats(updatedChats);
        }
      } else {
        // ── Streaming branch ──────────────────────────────────────────────
        if (apiType === 'anthropic') {
          stream = await getAnthropicChatCompletionStream(
            useStore.getState().apiEndpoint,
            messages,
            chats[currentChatIndex].config,
            apiKey || undefined
          );
        } else {
          // OpenAI streaming (unchanged)
          if (!apiKey || apiKey.length === 0) {
            if (apiEndpoint === officialAPIEndpoint) {
              throw new Error(t('noApiKeyWarning') as string);
            }
            stream = await getChatCompletionStream(
              useStore.getState().apiEndpoint,
              messages,
              chats[currentChatIndex].config,
              undefined,
              undefined,
              useStore.getState().apiVersion
            );
          } else if (apiKey) {
            stream = await getChatCompletionStream(
              useStore.getState().apiEndpoint,
              messages,
              chats[currentChatIndex].config,
              apiKey,
              undefined,
              useStore.getState().apiVersion
            );
          }
        }

        if (stream) {
          if (stream.locked)
            throw new Error(t('errors.streamLocked') as string);
          const reader = stream.getReader();
          let reading = true;
          let partial = '';

          while (reading && useStore.getState().generating) {
            const { done, value } = await reader.read();

            if (apiType === 'anthropic') {
              // ── Anthropic stream parsing ────────────────────────────────
              const rawData = partial + new TextDecoder().decode(value);

              // On stream EOF (done=true), flush all remaining bytes.
              // Otherwise save tail after last \n\n to partial to handle split events.
              let toProcess: string;
              if (done) {
                toProcess = rawData;
                partial = '';
              } else {
                const lastBoundary = rawData.lastIndexOf('\n\n');
                if (lastBoundary === -1) {
                  partial = rawData;
                  toProcess = '';
                } else {
                  toProcess = rawData.slice(0, lastBoundary + 2);
                  partial = rawData.slice(lastBoundary + 2);
                }
              }

              const { chunks, done: anthropicDone } =
                parseAnthropicEventSource(toProcess);

              if (done || anthropicDone) {
                reading = false;
              }

              const resultString = chunks.reduce(
                (output: string, curr) => output + curr.delta.text,
                ''
              );

              if (resultString) {
                const updatedChats: ChatInterface[] = JSON.parse(
                  JSON.stringify(useStore.getState().chats)
                );
                const updatedMessages = updatedChats[currentChatIndex].messages;
                (
                  updatedMessages[updatedMessages.length - 1]
                    .content[0] as TextContentInterface
                ).text += resultString;
                setChats(updatedChats);
              }
            } else {
              // ── OpenAI stream parsing (unchanged) ──────────────────────
              const result = parseEventSource(
                partial + new TextDecoder().decode(value)
              );
              partial = '';

              if (result === '[DONE]' || done) {
                reading = false;
              } else {
                const resultString = result.reduce((output: string, curr) => {
                  if (typeof curr === 'string') {
                    partial += curr;
                  } else {
                    if (
                      !curr.choices ||
                      !curr.choices[0] ||
                      !curr.choices[0].delta
                    ) {
                      return output;
                    }
                    const content = curr.choices[0]?.delta?.content ?? null;
                    if (content) output += content;
                  }
                  return output;
                }, '');

                const updatedChats: ChatInterface[] = JSON.parse(
                  JSON.stringify(useStore.getState().chats)
                );
                const updatedMessages = updatedChats[currentChatIndex].messages;
                (
                  updatedMessages[updatedMessages.length - 1]
                    .content[0] as TextContentInterface
                ).text += resultString;
                setChats(updatedChats);
              }
            }
          }

          if (useStore.getState().generating) {
            reader.cancel(t('errors.cancelledByUser') as string);
          } else {
            reader.cancel(t('errors.generationCompleted') as string);
          }
          reader.releaseLock();
          stream.cancel();
        }
      }

      // ── Token accounting (unchanged) ────────────────────────────────────
      const currChats = useStore.getState().chats;
      const countTotalTokens = useStore.getState().countTotalTokens;

      if (currChats && countTotalTokens) {
        const model = currChats[currentChatIndex].config.model;
        const messages = currChats[currentChatIndex].messages;
        updateTotalTokenUsed(
          model,
          messages.slice(0, -1),
          messages[messages.length - 1]
        );
      }

      // ── Auto-title generation (unchanged) ───────────────────────────────
      if (
        useStore.getState().autoTitle &&
        currChats &&
        !currChats[currentChatIndex]?.titleSet
      ) {
        const messages_length = currChats[currentChatIndex].messages.length;
        const assistant_message =
          currChats[currentChatIndex].messages[messages_length - 1].content;
        const user_message =
          currChats[currentChatIndex].messages[messages_length - 2].content;

        const message: MessageInterface = {
          role: 'user',
          content: [
            ...user_message,
            ...assistant_message,
            {
              type: 'text',
              text: `Generate a title in less than 6 words for the conversation so far (language: ${i18n.language})`,
            } as TextContentInterface,
          ],
        };

        const updatedChats: ChatInterface[] = JSON.parse(
          JSON.stringify(useStore.getState().chats)
        );
        let title = (
          await generateTitle([message], updatedChats[currentChatIndex].config)
        ).trim();
        if (title.startsWith('"') && title.endsWith('"')) {
          title = title.slice(1, -1);
        }
        updatedChats[currentChatIndex].title = title;
        updatedChats[currentChatIndex].titleSet = true;
        setChats(updatedChats);

        if (countTotalTokens) {
          const model = _defaultChatConfig.model;
          updateTotalTokenUsed(model, [message], {
            role: 'assistant',
            content: [{ type: 'text', text: title } as TextContentInterface],
          });
        }
      }
    } catch (e: unknown) {
      const err = (e as Error).message;
      console.log(err);
      setError(err);
    }
    setGenerating(false);
  };

  return { handleSubmit, error };
};

export default useSubmit;
