import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Dialog from '@components/Dialog';
import Icon from '@components/Icon';

const AboutMenu = () => {
  const { t } = useTranslation(['main', 'about']);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  return (
    <>
      <button
        className='flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--fg-2)] text-[13px] transition-colors cursor-pointer'
        onClick={() => setIsModalOpen(true)}
      >
        <Icon name="about" />
        {t('about')}
      </button>
      {isModalOpen && (
        <Dialog
          title={t('title', { ns: 'about' }) as string}
          setIsModalOpen={setIsModalOpen}
          cancelButton={false}
        >
          <div className='px-6 py-5 border-b border-[var(--border-mid)] flex flex-col gap-3 text-sm leading-relaxed text-[var(--fg-2)]'>
            <p>{t('paragraph1', { ns: 'about' })}</p>
            <p>{t('paragraph2', { ns: 'about' })}</p>
            <p>{t('paragraph3', { ns: 'about' })}</p>
          </div>
        </Dialog>
      )}
    </>
  );
};

export default AboutMenu;
