import React from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@components/Icon';

// Mainstream-style empty chat: greeting + a few example prompts the user can tap
// to start, plus a subtle "Customize" toggle that reveals the system prompt
// (which otherwise stays out of the way). The editor view returns as soon as the
// conversation has any user/assistant message.
const EmptyState = ({
  onPick,
  hasSystem,
  showSystem,
  onToggleSystem,
}: {
  onPick: (text: string) => void;
  hasSystem: boolean;
  showSystem: boolean;
  onToggleSystem: () => void;
}) => {
  const { t } = useTranslation();
  const suggestions = [
    t('emptyState.s1'),
    t('emptyState.s2'),
    t('emptyState.s3'),
    t('emptyState.s4'),
  ];

  return (
    <div className='flex flex-col items-center text-center px-2 pt-10 pb-6 gap-3'>
      <h2 className='font-serif text-2xl text-[var(--fg)]'>
        {t('emptyState.greeting')}
      </h2>
      <p className='text-sm text-[var(--fg-3)]'>{t('emptyState.subtitle')}</p>

      <div className='mt-3 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2'>
        {suggestions.map((s) => (
          <button
            key={s}
            type='button'
            onClick={() => onPick(s)}
            className='text-left text-[13px] text-[var(--fg-2)] border border-[var(--border-mid)] rounded-xl px-3.5 py-3 hover:bg-[var(--bg-hover)] hover:text-[var(--fg)] hover:border-[var(--border)] transition-colors cursor-pointer'
          >
            {s}
          </button>
        ))}
      </div>

      <button
        type='button'
        onClick={onToggleSystem}
        aria-expanded={hasSystem && showSystem}
        className='mt-2 flex items-center gap-1.5 text-[12px] text-[var(--fg-3)] hover:text-[var(--fg)] transition-colors cursor-pointer'
      >
        <Icon name='setting' className='w-3.5 h-3.5' />
        {t('emptyState.customize')}
      </button>
    </div>
  );
};

export default EmptyState;
