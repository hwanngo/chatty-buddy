import React from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '@store/store';
import { exportPrompts } from '@utils/prompt';

const ExportPrompt = () => {
  const { t } = useTranslation();
  const prompts = useStore.getState().prompts;

  return (
    <div className='flex flex-col gap-2'>
      <p className='text-sm font-semibold text-[#141413] dark:text-[#faf9f5]'>
        {t('export')} (CSV)
      </p>
      <div>
        <button
          className='btn btn-small btn-primary'
          onClick={() => {
            exportPrompts(prompts);
          }}
          aria-label={t('export') as string}
        >
          {t('export')}
        </button>
      </div>
    </div>
  );
};

export default ExportPrompt;
