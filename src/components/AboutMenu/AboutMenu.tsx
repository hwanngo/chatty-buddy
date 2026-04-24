import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PopupModal from '@components/PopupModal';
import AboutIcon from '@icon/AboutIcon';

const AboutMenu = () => {
  const { t } = useTranslation(['main', 'about']);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  return (
    <>
      <button
        className='flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#f0eee6] dark:hover:bg-[#3a3a37] text-[#5e5d59] dark:text-[#b0aea5] text-[13px] transition-colors cursor-pointer'
        onClick={() => setIsModalOpen(true)}
      >
        <AboutIcon />
        {t('about')}
      </button>
      {isModalOpen && (
        <PopupModal
          title={t('title', { ns: 'about' }) as string}
          setIsModalOpen={setIsModalOpen}
          cancelButton={false}
        >
          <div className='px-6 py-5 border-b border-[#e8e6dc] dark:border-[#30302e] flex flex-col gap-3 text-sm leading-relaxed text-[#5e5d59] dark:text-[#b0aea5]'>
            <p>{t('paragraph1', { ns: 'about' })}</p>
            <p>{t('paragraph2', { ns: 'about' })}</p>
            <p>{t('paragraph3', { ns: 'about' })}</p>
          </div>
        </PopupModal>
      )}
    </>
  );
};

export default AboutMenu;
