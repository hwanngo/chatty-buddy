import React, { useEffect, useState } from 'react';
import useStore from '@store/store';
import { useTranslation, Trans } from 'react-i18next';

import PopupModal from '@components/PopupModal';

const ApiPopup = () => {
  const { t } = useTranslation(['main', 'api']);

  const apiKey = useStore((state) => state.apiKey);
  const setApiKey = useStore((state) => state.setApiKey);
  const firstVisit = useStore((state) => state.firstVisit);
  const setFirstVisit = useStore((state) => state.setFirstVisit);
  const setToastMessage = useStore((state) => state.setToastMessage);
  const setToastStatus = useStore((state) => state.setToastStatus);
  const setToastShow = useStore((state) => state.setToastShow);

  const [_apiKey, _setApiKey] = useState<string>(apiKey || '');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(
    !apiKey && firstVisit
  );

  const handleConfirm = () => {
    if (_apiKey.length === 0) {
      setToastMessage(t('noApiKeyWarning', { ns: 'api' }) as string);
      setToastStatus('error');
      setToastShow(true);
    } else {
      setApiKey(_apiKey);
      setIsModalOpen(false);
    }
  };

  useEffect(() => {
    setFirstVisit(false);
  }, []);

  return isModalOpen ? (
    <PopupModal
      title={t('setupApiKey', { ns: 'api' })}
      handleConfirm={handleConfirm}
      setIsModalOpen={setIsModalOpen}
      cancelButton={false}
    >
      <div className='p-6 border-b border-[#e8e6dc] dark:border-[#3d3d3a]'>
        <div className='mt-2'>
          <label className='block text-sm font-medium text-[#141413] dark:text-[#faf9f5] mb-1.5'>
            {t('apiKey.inputLabel', { ns: 'api' })}
          </label>
          <input
            type='text'
            className='w-full text-[#141413] dark:text-[#faf9f5] px-3 py-2 text-sm bg-[#f0eee6] dark:bg-[#30302e] border border-[#e8e6dc] dark:border-[#3d3d3a] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3898ec]'
            value={_apiKey}
            onChange={(e) => {
              _setApiKey(e.target.value);
            }}
          />
        </div>

        <div className='min-w-fit text-[#141413] dark:text-[#faf9f5] text-sm mt-4'>
          <Trans
            i18nKey='apiKey.howTo'
            ns='api'
            components={[
              <a
                href='https://platform.openai.com/account/api-keys'
                className='link'
                target='_blank'
              />,
            ]}
          />
        </div>
        <div className='min-w-fit text-[#141413] dark:text-[#faf9f5] text-sm mt-4'>
          <Trans
            i18nKey='advancedConfig'
            ns='api'
            components={[
              <a
                className='link cursor-pointer'
                onClick={() => {
                  setIsModalOpen(false);
                  document.getElementById('api-menu')?.click();
                }}
              />,
            ]}
          />
        </div>

        <div className='min-w-fit text-[#141413] dark:text-[#faf9f5] text-sm mt-4'>
          {t('securityMessage', { ns: 'api' })}
        </div>
      </div>
    </PopupModal>
  ) : (
    <></>
  );
};

export default ApiPopup;
