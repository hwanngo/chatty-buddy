import { v4 as uuidv4 } from 'uuid';
import {
  ChatInterface,
  ConfigInterface,
  ImageDetail,
  TextContentInterface,
} from '@type/chat';
import useStore from '@store/store';

export const _defaultSystemMessage =
  import.meta.env.VITE_DEFAULT_SYSTEM_MESSAGE ??
  `You are a helpful assistant.
Carefully heed the user's instructions.
Respond using Markdown.`;

export const defaultApiVersion = '';
// Fallback default used before the model list loads. Once models are ready and
// `autoModel` is on, this is replaced at runtime with the latest OpenAI flagship
// (see getLatestOpenAIModel + the apply-on-ready effect in App.tsx). This exact
// value is also the v1→v2 migration sentinel for "user is still on the default".
export const defaultModel = 'gpt-5.4';

export const defaultUserMaxToken = 128000;
export const reduceMessagesToTotalToken = 256000; // sufficient for almost all models; gemini has 1.5kk though

export const _defaultChatConfig: ConfigInterface = {
  model: defaultModel,
  max_tokens: defaultUserMaxToken,
  temperature: 1,
  presence_penalty: 0,
  top_p: 1,
  frequency_penalty: 0,
  webSearch: false,
  reasoningEffort: null,
};

export const generateDefaultChat = (
  title?: string,
  folder?: string
): ChatInterface => ({
  id: uuidv4(),
  title: title ? title : 'New Chat',
  messages:
    useStore.getState().defaultSystemMessage.length > 0
      ? [
          {
            role: 'system',
            content: [
              {
                type: 'text',
                text: useStore.getState().defaultSystemMessage,
              } as TextContentInterface,
            ],
          },
        ]
      : [],
  config: { ...useStore.getState().defaultChatConfig },
  titleSet: false,
  folder,
  imageDetail: useStore.getState().defaultImageDetail,
});

export const codeLanguageSubset = [
  'python',
  'javascript',
  'java',
  'go',
  'bash',
  'c',
  'cpp',
  'csharp',
  'css',
  'diff',
  'graphql',
  'json',
  'kotlin',
  'less',
  'lua',
  'makefile',
  'markdown',
  'objectivec',
  'perl',
  'php',
  'php-template',
  'plaintext',
  'python-repl',
  'r',
  'ruby',
  'rust',
  'scss',
  'shell',
  'sql',
  'swift',
  'typescript',
  'vbnet',
  'wasm',
  'xml',
  'yaml',
];

export const _defaultMenuWidth = 260;
export const _defaultDisplayChatSize = false;
export const _defaultImageDetail: ImageDetail = 'auto';
