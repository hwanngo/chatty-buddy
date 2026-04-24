import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import Icon from '@components/Icon';
import Dialog from '@components/Dialog';

import ImportChat from './ImportChat';
import ExportChat from './ExportChat';

const ImportExportChat = () => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  return (
    <>
      <button
        className='flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--fg-2)] text-[13px] transition-colors cursor-pointer'
        onClick={() => {
          setIsModalOpen(true);
        }}
      >
        <Icon name="export" className='w-4 h-4' />
        {t('import')} / {t('export')}
      </button>
      {isModalOpen && (
        <Dialog
          title={`${t('import')} / ${t('export')}`}
          setIsModalOpen={setIsModalOpen}
          cancelButton={false}
        >
          <div className='flex flex-col divide-y divide-[var(--border-mid)]'>
            <div className='p-6'>
              <ImportChat />
            </div>
            <div className='p-6'>
              <ExportChat />
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
};

export default ImportExportChat;
