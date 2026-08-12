import useStore from '@store/store';
import { useTranslation } from 'react-i18next';
import {
  ChatInterface,
  ConfigInterface,
  MessageInterface,
  TextContentInterface,
  ToolCallInterface,
} from '@type/chat';
import { executeToolCall } from '@utils/tools';

/**
 * How many times the model may call a tool before we stop honouring requests
 * within a single submit. Each round is a full round-trip plus a page fetch on
 * the user's clock, and a model that loops would otherwise never hand back
 * control. Three is enough for "fetch, notice a redirect, fetch again".
 */
const MAX_TOOL_ROUNDS = 3;
import {
  getChatCompletion,
  getChatCompletionStream,
  getAnthropicChatCompletion,
  getAnthropicChatCompletionStream,
  getOllamaChatCompletion,
  getOllamaChatCompletionStream,
} from '@api/api';
import {
  parseEventSource,
  parseAnthropicEventSource,
  parseOllamaStream,
} from '@api/helper';
import { limitMessageTokens, updateTotalTokenUsed } from '@utils/messageUtils';
import { _defaultChatConfig } from '@constants/chat';
import { officialAPIEndpoint } from '@constants/auth';
import { modelStreamSupport } from '@constants/modelLoader';
import {
  startAbortController,
  clearAbortController,
  isAbortError,
} from '@utils/abortController';

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

  /** Appends text to the message currently being streamed into. */
  const appendToLastMessage = (text: string) => {
    const updatedChats: ChatInterface[] = JSON.parse(
      JSON.stringify(useStore.getState().chats)
    );
    const updatedMessages = updatedChats[currentChatIndex].messages;
    (
      updatedMessages[updatedMessages.length - 1]
        .content[0] as TextContentInterface
    ).text += text;
    setChats(updatedChats);
  };

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

      // ── Ollama native path ────────────────────────────────────────────
      if (apiType === 'ollama') {
        const titleChatConfig = {
          ...modelConfig,
          model: useStore.getState().titleModel ?? modelConfig.model,
          // A title is a one-liner; reasoning about it would cost more than
          // the title is worth.
          think: false,
        };
        const data = await getOllamaChatCompletion(
          useStore.getState().apiEndpoint,
          message,
          titleChatConfig,
          useStore.getState().apiKey || undefined
        );
        const titleText = data?.message?.content;
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

    const controller = startAbortController();
    const signal = controller.signal;

    try {
      // Anthropic always supports streaming; unknown OpenAI models default to
      // streaming (a missing entry means "model not in our list", not "no stream").
      const isStreamSupported =
        apiType === 'anthropic' || apiType === 'ollama'
          ? true
          : modelStreamSupport[chats[currentChatIndex].config.model] ?? true;

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
        if (apiType === 'ollama') {
          // isStreamSupported is always true for ollama, so this is a safety
          // fallback rather than a path the UI can normally reach.
          data = await getOllamaChatCompletion(
            useStore.getState().apiEndpoint,
            messages,
            chats[currentChatIndex].config,
            apiKey || undefined,
            signal
          );
          const text = data?.message?.content;
          if (!text) throw new Error(t('errors.failedToRetrieveData') as string);
          appendToLastMessage(
            data.message.thinking
              ? `<think>${data.message.thinking}</think>${text}`
              : text
          );
        } else if (apiType === 'anthropic') {
          // isStreamSupported is always true for Anthropic, so this is a safety fallback
          data = await getAnthropicChatCompletion(
            useStore.getState().apiEndpoint,
            messages,
            chats[currentChatIndex].config,
            apiKey || undefined,
            signal
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
              useStore.getState().apiVersion,
              signal
            );
          } else if (apiKey) {
            data = await getChatCompletion(
              useStore.getState().apiEndpoint,
              messages,
              chats[currentChatIndex].config,
              apiKey,
              undefined,
              useStore.getState().apiVersion,
              signal
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
        // What we send this round. When the model asks for a tool, its request
        // and the tool's result are appended here so the next round sees them.
        let roundMessages: MessageInterface[] = messages;

        for (let round = 0; ; round++) {
          if (apiType === 'anthropic') {
            stream = await getAnthropicChatCompletionStream(
              useStore.getState().apiEndpoint,
              roundMessages,
              chats[currentChatIndex].config,
              apiKey || undefined,
              signal
            );
          } else if (apiType === 'ollama') {
            stream = await getOllamaChatCompletionStream(
              useStore.getState().apiEndpoint,
              roundMessages,
              chats[currentChatIndex].config,
              apiKey || undefined,
              signal
            );
          } else {
            // The official endpoint is the only one that *requires* a key;
            // local and self-hosted endpoints are commonly keyless.
            if (
              (!apiKey || apiKey.length === 0) &&
              apiEndpoint === officialAPIEndpoint
            ) {
              throw new Error(t('noApiKeyWarning') as string);
            }
            stream = await getChatCompletionStream(
              useStore.getState().apiEndpoint,
              roundMessages,
              chats[currentChatIndex].config,
              apiKey || undefined,
              undefined,
              useStore.getState().apiVersion,
              signal
            );
          }

          // Tool calls stream in fragments — id and name in one chunk, the
          // JSON arguments dribbled across many — so they're accumulated by
          // index and only executed once the stream closes.
          const toolCallAcc: ToolCallInterface[] = [];

          if (stream) {
          if (stream.locked)
            throw new Error(t('errors.streamLocked') as string);
          const reader = stream.getReader();
          let reading = true;
          let partial = '';
          // Whether we're inside a synthetic `<think>` block. Providers that
          // stream reasoning in its own delta field get it folded into the
          // message content as `<think>…</think>`, which is exactly what local
          // runtimes emit natively — so reasoning has one representation
          // regardless of provider, and `splitThinking` renders both.
          let reasoningOpen = false;

          while (reading && useStore.getState().generating) {
            const { done, value } = await reader.read();

            if (apiType === 'ollama') {
              // ── Ollama native stream parsing ────────────────────────────
              // Newline-delimited JSON: hold back a trailing partial line, and
              // hand only whole lines to the parser.
              const rawData = partial + new TextDecoder().decode(value);
              let toProcess: string;
              if (done) {
                toProcess = rawData;
                partial = '';
              } else {
                const lastBreak = rawData.lastIndexOf('\n');
                if (lastBreak === -1) {
                  partial = rawData;
                  toProcess = '';
                } else {
                  toProcess = rawData.slice(0, lastBreak + 1);
                  partial = rawData.slice(lastBreak + 1);
                }
              }

              const { chunks, done: ollamaDone } = toProcess
                ? parseOllamaStream(toProcess)
                : { chunks: [], done: false };
              if (done || ollamaDone) reading = false;

              let resultString = '';
              for (const chunk of chunks) {
                const message = chunk.message;
                if (!message) continue;

                // Reasoning has its own field here. Fold it into the content
                // as `<think>` so it takes the same path as every other
                // provider and `splitThinking` renders it unchanged.
                if (message.thinking) {
                  if (!reasoningOpen) {
                    resultString += '<think>';
                    reasoningOpen = true;
                  }
                  resultString += message.thinking;
                }
                if (message.content) {
                  if (reasoningOpen) {
                    resultString += '</think>';
                    reasoningOpen = false;
                  }
                  resultString += message.content;
                }

                // Tool calls arrive complete rather than as fragments. The
                // arguments come as an object, so they're serialised here to
                // match the internal shape and keep the executor
                // protocol-agnostic.
                for (const call of message.tool_calls ?? []) {
                  toolCallAcc.push({
                    id:
                      call.id ??
                      `call_${toolCallAcc.length}_${call.function.name}`,
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

              if (resultString) appendToLastMessage(resultString);
            } else if (apiType === 'anthropic') {
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
              // ── OpenAI stream parsing ──────────────────────────────────
              // Buffer at the last \n\n boundary so a JSON event split across
              // two network reads isn't handed to JSON.parse half-formed.
              const rawData = partial + new TextDecoder().decode(value);

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

              const result = toProcess ? parseEventSource(toProcess) : [];

              let resultString = '';
              if (result !== '[DONE]') {
                for (const curr of result) {
                  if (typeof curr === 'string') {
                    if (curr === '[DONE]') reading = false;
                    continue;
                  }
                  if (!curr.choices || !curr.choices[0] || !curr.choices[0].delta)
                    continue;
                  const delta = curr.choices[0].delta;

                  // Reasoning arrives before the answer. Open a `<think>`
                  // block on the first reasoning delta and close it as soon as
                  // real content starts, so the two never run together.
                  const reasoning = delta.reasoning ?? delta.reasoning_content;
                  if (reasoning) {
                    if (!reasoningOpen) {
                      resultString += '<think>';
                      reasoningOpen = true;
                    }
                    resultString += reasoning;
                  }

                  const content = delta.content ?? null;
                  if (content) {
                    if (reasoningOpen) {
                      resultString += '</think>';
                      reasoningOpen = false;
                    }
                    resultString += content;
                  }

                  // Merge tool-call fragments by index. `id` and `name` show
                  // up once, `arguments` accumulates across many chunks, so
                  // only the argument string is concatenated.
                  for (const fragment of delta.tool_calls ?? []) {
                    const at = fragment.index ?? 0;
                    const slot = (toolCallAcc[at] ??= {
                      id: '',
                      type: 'function',
                      function: { name: '', arguments: '' },
                    });
                    if (fragment.id) slot.id = fragment.id;
                    if (fragment.function?.name)
                      slot.function.name = fragment.function.name;
                    if (fragment.function?.arguments)
                      slot.function.arguments += fragment.function.arguments;
                  }
                }
              }

              if (done) reading = false;

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
            }
          }

          // The stream can end mid-thought: the user stopped it, the model
          // reasoned until it hit a limit, or it simply never produced an
          // answer. Close the block so the stored message stays well-formed
          // instead of carrying a dangling `<think>`.
          if (reasoningOpen) {
            const updatedChats: ChatInterface[] = JSON.parse(
              JSON.stringify(useStore.getState().chats)
            );
            const updatedMessages = updatedChats[currentChatIndex].messages;
            (
              updatedMessages[updatedMessages.length - 1]
                .content[0] as TextContentInterface
            ).text += '</think>';
            setChats(updatedChats);
            reasoningOpen = false;
          }

          if (useStore.getState().generating) {
            reader.cancel(t('errors.cancelledByUser') as string);
          } else {
            reader.cancel(t('errors.generationCompleted') as string);
          }
          reader.releaseLock();
          stream.cancel();
        }

          // No tool requested, or the user stopped the run — this round's
          // answer is the final one.
          const requested = toolCallAcc.filter((c) => c && c.function.name);
          if (requested.length === 0 || !useStore.getState().generating) break;

          // A model that keeps calling tools would otherwise loop forever on
          // the user's clock. Stop, and say so in the transcript rather than
          // silently returning a half-finished answer.
          if (round >= MAX_TOOL_ROUNDS - 1) {
            appendToLastMessage(
              `\n\n_${t('errors.toolRoundLimit', {
                count: MAX_TOOL_ROUNDS,
              })}_`
            );
            break;
          }

          // Record the request on the assistant message that made it, then run
          // each call and append its result. Both go into the transcript, so a
          // follow-up question can still see what the page said.
          const assistantWithCalls: MessageInterface = {
            role: 'assistant',
            content: [{ type: 'text', text: '' } as TextContentInterface],
            tool_calls: requested,
          };

          const toolMessages: MessageInterface[] = [];
          for (const call of requested) {
            const result = await executeToolCall(call, signal);
            toolMessages.push({
              role: 'tool',
              tool_call_id: call.id,
              tool_name: result.label,
              content: [
                { type: 'text', text: result.content } as TextContentInterface,
              ],
            });
          }

          roundMessages = [...roundMessages, assistantWithCalls, ...toolMessages];

          // Mirror into the visible chat: annotate the placeholder we've been
          // streaming into, add the tool results, then open a fresh assistant
          // message for the next round to write to.
          const withTools: ChatInterface[] = JSON.parse(
            JSON.stringify(useStore.getState().chats)
          );
          const visible = withTools[currentChatIndex].messages;
          visible[visible.length - 1].tool_calls = requested;
          visible.push(...toolMessages, {
            role: 'assistant',
            content: [{ type: 'text', text: '' } as TextContentInterface],
          });
          setChats(withTools);
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
      // User pressed Stop — the request was aborted on purpose, not an error.
      if (!isAbortError(e)) {
        setError((e as Error).message);
      }
    } finally {
      clearAbortController();
      setGenerating(false);
    }
  };

  return { handleSubmit, error };
};

export default useSubmit;
