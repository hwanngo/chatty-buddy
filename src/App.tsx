import { useEffect } from 'react';
import useStore from '@store/store';
import i18n from './i18n';

import Chat from '@components/Chat';
import Menu from '@components/Menu';

import useInitialiseNewChat from '@hooks/useInitialiseNewChat';
import useLocalizedPrompts from '@hooks/useLocalizedPrompts';
import { ChatInterface } from '@type/chat';
import { Theme } from '@type/theme';
import { parseChatImport, mergeChatImport } from '@utils/import';
import FirstVisitApiSetup from '@components/ApiMenu/FirstVisitApiSetup';
import Toast from '@components/Toast';
import ErrorBoundary from '@components/ErrorBoundary';
import { onModelsReady, modelOptions } from '@constants/modelLoader';
import { getLatestOpenAIModel } from '@utils/modelReader';

function App() {
  const initialiseNewChat = useInitialiseNewChat();
  useLocalizedPrompts();
  const setTheme = useStore((state) => state.setTheme);
  const setApiKey = useStore((state) => state.setApiKey);
  const setCurrentChatIndex = useStore((state) => state.setCurrentChatIndex);
  const theme = useStore((state) => state.theme);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
    const updateLanguage = (lng: string) => {
      document.documentElement.lang = lng;
    };
    i18n.on('languageChanged', updateLanguage);
    return () => {
      i18n.off('languageChanged', updateLanguage);
    };
  }, []);

  // Apply theme class whenever theme changes (including on initial load)
  useEffect(() => {
    if (theme) document.documentElement.className = theme;
  }, [theme]);

  // Once the model list is loaded, point the default model at the
  // latest OpenAI flagship — unless the user explicitly chose a default model
  // (autoModel=false). Keeps "default model" tracking new OpenAI releases.
  useEffect(() => {
    return onModelsReady(() => {
      const latest = getLatestOpenAIModel(modelOptions);
      useStore.setState((prev) => {
        const patch: Partial<typeof prev> = {};

        if (latest && prev.autoModel) {
          const prevModel = prev.defaultChatConfig.model;
          if (prevModel !== latest)
            patch.defaultChatConfig = {
              ...prev.defaultChatConfig,
              model: latest,
            };
          // Preserve an explicitly chosen title model independently of autoModel.

          // The first chat is created at startup with the fallback model before
          // the list loads. Bump any *empty* chat (no user/assistant turn yet)
          // that's still on the old default — so the fresh chat sitting behind the
          // API-key setup modal ends up on the latest, never the stale fallback.
          // Real conversations are left untouched.
          if (prev.chats && prevModel !== latest) {
            const isEmpty = (c: ChatInterface) =>
              !c.messages.some(
                (m) => m.role === 'user' || m.role === 'assistant'
              );
            if (
              prev.chats.some((c) => c.config.model === prevModel && isEmpty(c))
            ) {
              patch.chats = prev.chats.map((c) =>
                c.config.model === prevModel && isEmpty(c)
                  ? { ...c, config: { ...c.config, model: latest } }
                  : c
              );
            }
          }
        }

        // Separately from the autoModel rule above — which tracks the newest
        // OpenAI release — a reload can publish a list that doesn't contain the
        // configured model at all (switch to a local Ollama and `gpt-5.4` is
        // simply gone). That leaves the picker blank and new chats aimed at a
        // model the server will reject, so anything *absent from the list*
        // falls back to the first option. A model still in the list is never
        // touched, whatever autoModel says.
        const fallback = modelOptions[0];
        if (fallback) {
          const isServed = (model: string) => modelOptions.includes(model);
          const nextConfig = patch.defaultChatConfig ?? prev.defaultChatConfig;
          if (!isServed(nextConfig.model))
            patch.defaultChatConfig = { ...nextConfig, model: fallback };
          // Title-model preferences are explicit and survive catalog refreshes.

          // Only the chat the user is looking at: rewriting every stored chat's
          // model would rewrite history the user may want back when they point
          // the app at the original endpoint again.
          const chats = patch.chats ?? prev.chats;
          const current = chats?.[prev.currentChatIndex];
          if (current && !isServed(current.config.model)) {
            patch.chats = chats!.map((c, i) =>
              i === prev.currentChatIndex
                ? { ...c, config: { ...c.config, model: fallback } }
                : c
            );
          }
        }

        return patch;
      });
    });
  }, []);

  useEffect(() => {
    // legacy local storage
    const oldChats = localStorage.getItem('chats');
    const apiKey = localStorage.getItem('apiKey');
    const theme = localStorage.getItem('theme');

    if (apiKey) {
      // legacy local storage
      setApiKey(apiKey);
      localStorage.removeItem('apiKey');
    }

    if (theme) {
      // legacy local storage
      setTheme(theme as Theme);
      localStorage.removeItem('theme');
    }

    if (oldChats) {
      // legacy local storage
      try {
        const imported = parseChatImport(JSON.parse(oldChats));
        if (imported.chats.length > 0) {
          useStore.setState(mergeChatImport(useStore.getState(), imported));
        } else {
          initialiseNewChat();
        }
        localStorage.removeItem('chats');
      } catch {
        // Preserve the original document for export/recovery after validation fails.
        useStore
          .getState()
          .addToast(
            'error',
            'The legacy backup could not be imported. Its original data is still saved in this browser.'
          );
        if (!useStore.getState().chats?.length) initialiseNewChat();
      }
    } else {
      // existing local storage
      const chats = useStore.getState().chats;
      const currentChatIndex = useStore.getState().currentChatIndex;
      if (!chats || chats.length === 0) {
        initialiseNewChat();
      }
      if (
        chats &&
        !(currentChatIndex >= 0 && currentChatIndex < chats.length)
      ) {
        setCurrentChatIndex(0);
      }
    }
  }, []);

  return (
    <ErrorBoundary>
      <div className='overflow-hidden w-full h-full relative'>
        <Menu />
        <div className={`flex h-full flex-1 flex-col`}>
          <Chat />
          <FirstVisitApiSetup />
          <Toast />
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;
