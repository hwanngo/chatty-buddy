import React from 'react';
import { useTranslation } from 'react-i18next';

import useStore from '@store/store';
import Icon from '@components/Icon';
import useAddChat from '@hooks/useAddChat';

const MobileBar = () => {
  const { t } = useTranslation();
  const generating = useStore((state) => state.generating);
  const setHideSideMenu = useStore((state) => state.setHideSideMenu);
  const chatTitle = useStore((state) =>
    state.chats &&
    state.chats.length > 0 &&
    state.currentChatIndex >= 0 &&
    state.currentChatIndex < state.chats.length
      ? state.chats[state.currentChatIndex].title
      : t('newChat')
  );

  const addChat = useAddChat();

  return (
    <div className='sticky top-0 left-0 w-full z-50 flex items-center border-b border-[var(--border)] bg-[var(--bg)] pl-1 pt-1 text-[var(--fg-btn)] sm:pl-3 md:hidden'>
      <button
        type='button'
        className='-ml-0.5 -mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-[var(--bg-sand)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--ring)] cursor-pointer'
        onClick={() => {
          setHideSideMenu(false);
        }}
        aria-label={t('openSidebar')}
      >
        <Icon name="menu" />
      </button>
      <h1 className='flex-1 text-center text-base font-normal px-2 max-h-20 overflow-y-auto'>
        {chatTitle}
      </h1>
      <button
        type='button'
        disabled={generating}
        className={`tap-target px-3 text-[var(--fg-3)] transition-opacity ${
          generating
            ? 'cursor-not-allowed opacity-40'
            : 'cursor-pointer opacity-100'
        }`}
        onClick={() => {
          if (!generating) addChat();
        }}
        aria-label={t('newChat')}
      >
        <Icon name="plus" className='h-6 w-6' />
      </button>
    </div>
  );
};

export default MobileBar;
