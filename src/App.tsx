import React, { useEffect } from 'react';
import useStore from '@store/store';
import i18n from './i18n';

import Chat from '@components/Chat';
import Menu from '@components/Menu';

import useInitialiseNewChat from '@hooks/useInitialiseNewChat';
import useLocalizedPrompts from '@hooks/useLocalizedPrompts';
import { ChatInterface } from '@type/chat';
import { Theme } from '@type/theme';
import FirstVisitApiSetup from '@components/ApiMenu/FirstVisitApiSetup';
import Toast from '@components/Toast';
import ErrorBoundary from '@components/ErrorBoundary';
import { onModelsReady, modelOptions } from '@constants/modelLoader';
import { getLatestOpenAIModel } from '@utils/modelReader';

function App() {
  const initialiseNewChat = useInitialiseNewChat();
  useLocalizedPrompts();
  const setChats = useStore((state) => state.setChats);
  const setTheme = useStore((state) => state.setTheme);
  const setApiKey = useStore((state) => state.setApiKey);
  const setCurrentChatIndex = useStore((state) => state.setCurrentChatIndex);
  const theme = useStore((state) => state.theme);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
    i18n.on('languageChanged', (lng) => {
      document.documentElement.lang = lng;
    });
  }, []);

  // Apply theme class whenever theme changes (including on initial load)
  useEffect(() => {
    if (theme) document.documentElement.className = theme;
  }, [theme]);

  // Once the model list is loaded, point the default (and title) model at the
  // latest OpenAI flagship — unless the user explicitly chose a default model
  // (autoModel=false). Keeps "default model" tracking new OpenAI releases.
  useEffect(() => {
    return onModelsReady(() => {
      const latest = getLatestOpenAIModel(modelOptions);
      if (!latest) return;
      useStore.setState((prev) => {
        if (!prev.autoModel) return {};
        const prevModel = prev.defaultChatConfig.model;
        const patch: Partial<typeof prev> = {};
        if (prevModel !== latest)
          patch.defaultChatConfig = { ...prev.defaultChatConfig, model: latest };
        if (prev.titleModel !== latest) patch.titleModel = latest;

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
        const chats: ChatInterface[] = JSON.parse(oldChats);
        if (chats.length > 0) {
          setChats(chats);
          setCurrentChatIndex(0);
        } else {
          initialiseNewChat();
        }
      } catch (e: unknown) {
        console.log(e);
        initialiseNewChat();
      }
      localStorage.removeItem('chats');
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
