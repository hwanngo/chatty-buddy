import React from 'react';

import useStore from '@store/store';
import PlusIcon from '@icon/PlusIcon';
import MenuIcon from '@icon/MenuIcon';
import useAddChat from '@hooks/useAddChat';

const MobileBar = () => {
  const generating = useStore((state) => state.generating);
  const setHideSideMenu = useStore((state) => state.setHideSideMenu);
  const chatTitle = useStore((state) =>
    state.chats &&
    state.chats.length > 0 &&
    state.currentChatIndex >= 0 &&
    state.currentChatIndex < state.chats.length
      ? state.chats[state.currentChatIndex].title
      : 'New Chat'
  );

  const addChat = useAddChat();

  return (
    <div className='sticky top-0 left-0 w-full z-50 flex items-center border-b border-[#f0eee6] dark:border-[#30302e] bg-[#f5f4ed] dark:bg-[#141413] pl-1 pt-1 text-[#4d4c48] dark:text-[#b0aea5] sm:pl-3 md:hidden'>
      <button
        type='button'
        className='-ml-0.5 -mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-[#e8e6dc] dark:hover:bg-[#30302e] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#d1cfc5] cursor-pointer'
        onClick={() => {
          setHideSideMenu(false);
        }}
        aria-label='open sidebar'
      >
        <span className='sr-only'>Open sidebar</span>
        <MenuIcon />
      </button>
      <h1 className='flex-1 text-center text-base font-normal px-2 max-h-20 overflow-y-auto'>
        {chatTitle}
      </h1>
      <button
        type='button'
        className={`px-3 text-[#87867f] dark:text-[#87867f] transition-opacity ${
          generating
            ? 'cursor-not-allowed opacity-40'
            : 'cursor-pointer opacity-100'
        }`}
        onClick={() => {
          if (!generating) addChat();
        }}
        aria-label='new chat'
      >
        <PlusIcon className='h-6 w-6' />
      </button>
    </div>
  );
};

export default MobileBar;
