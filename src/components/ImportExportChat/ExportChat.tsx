import React from 'react';
import { useTranslation } from 'react-i18next';

import useStore from '@store/store';

import downloadFile from '@utils/downloadFile';
import { getToday } from '@utils/date';

import Export from '@type/export';

const ExportChat = () => {
  const { t } = useTranslation();

  return (
    <div className='flex flex-col gap-3'>
      <div>
        <p className='text-sm font-semibold text-[#141413] dark:text-[#faf9f5]'>
          {t('export')} (JSON)
        </p>
        <p className='text-xs text-[#87867f] dark:text-[#6b6a65] mt-0.5'>
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
            const fileData: Export = {
              chats: useStore.getState().chats,
              folders: useStore.getState().folders,
              version: 1,
            };
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
