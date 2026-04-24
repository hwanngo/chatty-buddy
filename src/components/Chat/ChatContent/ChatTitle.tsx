import React, { useEffect } from 'react';
import useStore from '@store/store';
import { ChatInterface } from '@type/chat';
import { _defaultChatConfig } from '@constants/chat';

const ChatTitle = React.memo(() => {
  const chat = useStore((state) =>
    state.chats &&
    state.chats.length > 0 &&
    state.currentChatIndex >= 0 &&
    state.currentChatIndex < state.chats.length
      ? state.chats[state.currentChatIndex]
      : undefined
  );
  const setChats = useStore((state) => state.setChats);
  const currentChatIndex = useStore((state) => state.currentChatIndex);

  // migrate old ChatInterface without config
  useEffect(() => {
    const chats = useStore.getState().chats;
    if (chats && chats.length > 0 && currentChatIndex !== -1 && !chat?.config) {
      const updatedChats: ChatInterface[] = JSON.parse(JSON.stringify(chats));
      updatedChats[currentChatIndex].config = { ..._defaultChatConfig };
      setChats(updatedChats);
    }
  }, [currentChatIndex]);

  return null;
});

export default ChatTitle;
