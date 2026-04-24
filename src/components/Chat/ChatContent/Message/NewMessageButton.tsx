import React from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '@store/store';

import Icon from '@components/Icon';

import { ChatInterface, TextContentInterface } from '@type/chat';
import { generateDefaultChat } from '@constants/chat';

const NewMessageButton = React.memo(
  ({ messageIndex }: { messageIndex: number }) => {
    const { t } = useTranslation();
    const setChats = useStore((state) => state.setChats);
    const currentChatIndex = useStore((state) => state.currentChatIndex);
    const setCurrentChatIndex = useStore((state) => state.setCurrentChatIndex);

    const addChat = () => {
      const chats = useStore.getState().chats;
      if (chats) {
        const updatedChats: ChatInterface[] = JSON.parse(JSON.stringify(chats));
        let titleIndex = 1;
        let title = `New Chat ${titleIndex}`;

        while (chats.some((chat) => chat.title === title)) {
          titleIndex += 1;
          title = `New Chat ${titleIndex}`;
        }

        updatedChats.unshift(generateDefaultChat(title));
        setChats(updatedChats);
        setCurrentChatIndex(0);
      }
    };

    const addMessage = () => {
      if (currentChatIndex === -1) {
        addChat();
      } else {
        const updatedChats: ChatInterface[] = JSON.parse(
          JSON.stringify(useStore.getState().chats)
        );
        updatedChats[currentChatIndex].messages.splice(messageIndex + 1, 0, {
          content: [{ type: 'text', text: '' } as TextContentInterface],
          role: 'user',
        });
        setChats(updatedChats);
      }
    };

    return (
      <div
        className='flex justify-center py-0.5'
        key={messageIndex}
        aria-label='insert message'
      >
        <button
          className='flex items-center justify-center w-6 h-6 rounded-full border border-[var(--border-mid)] bg-transparent text-[var(--fg-3)] opacity-30 hover:opacity-100 hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all duration-150 cursor-pointer'
          onClick={addMessage}
          title={t('insertMessage')}
        >
          <Icon name="plus" className='w-3.5 h-3.5' />
        </button>
      </div>
    );
  }
);

export default NewMessageButton;
