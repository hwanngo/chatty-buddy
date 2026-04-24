import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '@store/store';

import { ChatInterface } from '@type/chat';

import TickIcon from '@icon/TickIcon';
import CloneIcon from '@icon/CloneIcon';

const CloneChat = React.memo(() => {
  const { t } = useTranslation();

  const setChats = useStore((state) => state.setChats);
  const setCurrentChatIndex = useStore((state) => state.setCurrentChatIndex);

  const [cloned, setCloned] = useState<boolean>(false);

  const cloneChat = () => {
    const chats = useStore.getState().chats;

    if (chats) {
      const index = useStore.getState().currentChatIndex;
      let title = `Copy of ${chats[index].title}`;
      let i = 0;

      while (chats.some((chat) => chat.title === title)) {
        i += 1;
        title = `Copy ${i} of ${chats[index].title}`;
      }

      const clonedChat = JSON.parse(JSON.stringify(chats[index]));
      clonedChat.title = title;

      const updatedChats: ChatInterface[] = JSON.parse(JSON.stringify(chats));
      updatedChats.unshift(clonedChat);

      setChats(updatedChats);
      setCurrentChatIndex(useStore.getState().currentChatIndex + 1);
      setCloned(true);

      window.setTimeout(() => {
        setCloned(false);
      }, 3000);
    }
  };

  return (
    <button
      className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e8e6dc] dark:border-[#3d3d3a] bg-transparent text-[#5e5d59] dark:text-[#b0aea5] text-[13px] font-medium hover:bg-[#f0eee6] dark:hover:bg-[#30302e] hover:text-[#141413] dark:hover:text-[#faf9f5] transition-colors duration-150 cursor-pointer'
      aria-label={t('cloneChat') as string}
      onClick={cloneChat}
    >
      {cloned ? (
        <>
          <TickIcon /> {t('cloned')}
        </>
      ) : (
        <>
          <CloneIcon className='w-[14px] h-[14px]' /> {t('cloneChat')}
        </>
      )}
    </button>
  );
});

export default CloneChat;
