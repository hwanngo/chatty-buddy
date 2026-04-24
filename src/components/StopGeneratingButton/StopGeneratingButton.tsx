import React from 'react';
import useStore from '@store/store';
import { useTranslation } from 'react-i18next';
import { abortActiveController } from '@utils/abortController';

const StopGeneratingButton = () => {
  const { t } = useTranslation();
  const setGenerating = useStore((state) => state.setGenerating);
  const generating = useStore((state) => state.generating);

  // Abort the in-flight request (works for streaming and non-streaming alike)
  // and flip the flag so the loop and UI stop immediately.
  const handleGeneratingStop = () => {
    abortActiveController();
    setGenerating(false);
  };

  return generating ? (
    <div
      className='absolute bottom-6 left-0 right-0 m-auto flex md:w-full md:m-auto gap-0 md:gap-2 justify-center'
      onClick={() => handleGeneratingStop()}
    >
      <button
        className='btn relative btn-neutral border-0 md:border min-h-[44px]'
        aria-label={t('stopGenerating')}
      >
        <div className='flex w-full items-center justify-center gap-2'>
          <svg
            stroke='currentColor'
            fill='none'
            strokeWidth='1.5'
            viewBox='0 0 24 24'
            strokeLinecap='round'
            strokeLinejoin='round'
            className='h-4 w-4'
            xmlns='http://www.w3.org/2000/svg'
          >
            <rect x='3' y='3' width='18' height='18' rx='2' ry='2'></rect>
          </svg>
          {t('stopGenerating')}
        </div>
      </button>
    </div>
  ) : (
    <></>
  );
};

export default StopGeneratingButton;
