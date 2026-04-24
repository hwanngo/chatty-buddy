import React from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '@store/store';

import Icon from '@components/Icon';

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
          ? 'justify-start text-[var(--fg-btn)] hover:bg-[var(--bg-sand)]'
          : 'py-2 px-3 gap-2 font-medium bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)]'
      }`}
      onClick={() => {
        if (!generating) addChat(folder);
      }}
      title={folder ? String(t('newChat')) : ''}
    >
      {folder ? (
        <div className='max-h-0 parent-sibling-hover:max-h-10 hover:max-h-10 parent-sibling-hover:py-2 hover:py-2 px-2 overflow-hidden transition-all duration-200 delay-500 text-sm flex gap-3 items-center text-[var(--fg-3)]'>
          <Icon name="plus" /> {t('newChat')}
        </div>
      ) : (
        <>
          <Icon name="plus" />
          <span className='inline-flex text-sm'>{t('newChat')}</span>
        </>
      )}
    </a>
  );
};

export default NewChat;
