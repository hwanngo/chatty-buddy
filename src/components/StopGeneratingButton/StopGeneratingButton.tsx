import React from 'react';
import useStore from '@store/store';
import { useTranslation } from 'react-i18next';
import { abortActiveController } from '@utils/abortController';

/**
 * Interrupt control for an in-flight response. It sits in the composer toolbar
 * in the send button's slot — the send button hides while generating, so the
 * stop control takes its place and the row keeps its shape.
 */
const StopGeneratingButton = () => {
  const { t } = useTranslation();
  const generating = useStore((state) => state.generating);

  // Abort the in-flight request (works for streaming and non-streaming alike)
  // and flip the flag so the loop and UI stop immediately.
  const handleGeneratingStop = () => {
    abortActiveController();
    useStore.getState().setGenerating(false);
  };

  if (!generating) return null;

  return (
    <button
      type='button'
      onClick={handleGeneratingStop}
      aria-label={t('stopGenerating') as string}
      className='flex items-center gap-1.5 px-3 py-1.5 max-md:min-h-[44px] rounded-lg border border-[var(--border-mid)] bg-[var(--bg-hover)] text-[var(--fg-2)] text-[13px] font-medium hover:bg-[var(--bg-sand)] hover:text-[var(--fg)] transition-colors duration-150 cursor-pointer'
    >
      <svg
        viewBox='0 0 24 24'
        className='h-3.5 w-3.5'
        fill='currentColor'
        aria-hidden='true'
        xmlns='http://www.w3.org/2000/svg'
      >
        <rect x='6' y='6' width='12' height='12' rx='1.5' />
      </svg>
      {t('stop')}
    </button>
  );
};

export default StopGeneratingButton;
