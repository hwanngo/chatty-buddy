import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import ApiMenu from '@components/ApiMenu';

const KeyIcon = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    className='w-4 h-4'
  >
    <path d='M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4' />
  </svg>
);

const Config = () => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  return (
    <>
      <button
        className='flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#f0eee6] dark:hover:bg-[#3a3a37] text-[#5e5d59] dark:text-[#b0aea5] text-[13px] transition-colors cursor-pointer'
        id='api-menu'
        onClick={() => setIsModalOpen(true)}
      >
        <KeyIcon />
        {t('api')}
      </button>
      {isModalOpen && <ApiMenu setIsModalOpen={setIsModalOpen} />}
    </>
  );
};

export default Config;
