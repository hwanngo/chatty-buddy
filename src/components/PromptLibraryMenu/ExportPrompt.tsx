import { useTranslation } from 'react-i18next';
import { Prompt } from '@type/prompt';
import { exportPrompts } from '@utils/prompt';

const ExportPrompt = ({ prompts }: { prompts: Prompt[] }) => {
  const { t } = useTranslation();

  return (
    <div className='flex flex-col gap-2'>
      <p className='text-sm font-semibold text-[var(--fg)]'>
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
