import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import ExportIcon from '@icon/ExportIcon';
import PopupModal from '@components/PopupModal';

import ImportChat from './ImportChat';
import ExportChat from './ExportChat';

const ImportExportChat = () => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  return (
    <>
      <button
        className='flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#f0eee6] dark:hover:bg-[#3a3a37] text-[#5e5d59] dark:text-[#b0aea5] text-[13px] transition-colors cursor-pointer'
        onClick={() => {
          setIsModalOpen(true);
        }}
      >
        <ExportIcon className='w-4 h-4' />
        {t('import')} / {t('export')}
      </button>
      {isModalOpen && (
        <PopupModal
          title={`${t('import')} / ${t('export')}`}
          setIsModalOpen={setIsModalOpen}
          cancelButton={false}
        >
          <div className='flex flex-col divide-y divide-[#e8e6dc] dark:divide-[#30302e] border-b border-[#e8e6dc] dark:border-[#30302e]'>
            <div className='p-6'>
              <ImportChat />
            </div>
            <div className='p-6'>
              <ExportChat />
            </div>
          </div>
        </PopupModal>
      )}
    </>
  );
};

export default ImportExportChat;
