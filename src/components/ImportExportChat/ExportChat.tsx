import { useTranslation } from 'react-i18next';

import useStore from '@store/store';

import downloadFile from '@utils/downloadFile';
import { getToday } from '@utils/date';

import { createChatExport } from '@utils/import';

const ExportChat = () => {
  const { t } = useTranslation();

  return (
    <div className='flex flex-col gap-3'>
      <div>
        <p className='text-sm font-semibold text-[var(--fg)]'>
          {t('export')} (JSON)
        </p>
        <p className='text-xs text-[var(--fg-3)] mt-0.5'>
          {t('exportDescription', {
            defaultValue:
              'Download all your chats and folders as a JSON file for backup or transfer.',
          })}
        </p>
      </div>
      <div>
        <button
          className='btn btn-small btn-primary'
          onClick={() => {
            const fileData = createChatExport(
              useStore.getState().chats,
              useStore.getState().folders
            );
            downloadFile(fileData, getToday());
          }}
          aria-label={t('export') as string}
        >
          {t('export')}
        </button>
      </div>
    </div>
  );
};
export default ExportChat;
