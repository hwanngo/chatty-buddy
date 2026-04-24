import React from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '@store/store';

import PlusIcon from '@icon/PlusIcon';

import useAddChat from '@hooks/useAddChat';

const NewChat = ({ folder }: { folder?: string }) => {
  const { t } = useTranslation();
  const addChat = useAddChat();
  const generating = useStore((state) => state.generating);

  return (
    <a
      className={`flex flex-1 items-center rounded-lg transition-colors duration-150 text-sm flex-shrink-0 ${
        generating
          ? 'cursor-not-allowed opacity-40'
          : 'cursor-pointer opacity-100'
      } ${
        folder
          ? 'justify-start text-[#4d4c48] dark:text-[#b0aea5] hover:bg-[#e8e6dc] dark:hover:bg-[#30302e]'
          : 'py-2 px-3 gap-2 font-medium bg-[#c96442] hover:bg-[#b85538] text-[#faf9f5]'
      }`}
      onClick={() => {
        if (!generating) addChat(folder);
      }}
      title={folder ? String(t('newChat')) : ''}
    >
      {folder ? (
        <div className='max-h-0 parent-sibling-hover:max-h-10 hover:max-h-10 parent-sibling-hover:py-2 hover:py-2 px-2 overflow-hidden transition-all duration-200 delay-500 text-sm flex gap-3 items-center text-[#5e5d59] dark:text-[#87867f]'>
          <PlusIcon /> {t('newChat')}
        </div>
      ) : (
        <>
          <PlusIcon />
          <span className='inline-flex text-sm'>{t('newChat')}</span>
        </>
      )}
    </a>
  );
};

export default NewChat;
