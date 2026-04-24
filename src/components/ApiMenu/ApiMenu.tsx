import React, { useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import useStore from '@store/store';
import Select from '@components/Select';

import Dialog from '@components/Dialog';
import Toggle from '@components/Toggle/Toggle';

import {
  anthropicAPIEndpoint,
  availableEndpoints,
  defaultAPIEndpoint,
} from '@constants/auth';
import { isAzureEndpoint } from '@utils/api';
import { ApiType } from '@store/auth-slice';

const ApiMenu = ({
  setIsModalOpen,
  firstRun = false,
}: {
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  firstRun?: boolean;
}) => {
  const { t } = useTranslation(['main', 'api']);

  const apiKey = useStore((state) => state.apiKey);
  const setApiKey = useStore((state) => state.setApiKey);
  const addToast = useStore((state) => state.addToast);
  const apiEndpoint = useStore((state) => state.apiEndpoint);
  const setApiEndpoint = useStore((state) => state.setApiEndpoint);
  const apiVersion = useStore((state) => state.apiVersion);
  const setApiVersion = useStore((state) => state.setApiVersion);
  const apiType = useStore((state) => state.apiType);
  const setApiType = useStore((state) => state.setApiType);

  const [_apiKey, _setApiKey] = useState<string>(apiKey || '');
  const [_apiEndpoint, _setApiEndpoint] = useState<string>(apiEndpoint);
  const [_customEndpoint, _setCustomEndpoint] = useState<boolean>(
    !availableEndpoints.includes(apiEndpoint)
  );
  const [_apiVersion, _setApiVersion] = useState<string>(apiVersion || '');
  const [_apiType, _setApiType] = useState<ApiType>(apiType ?? 'openai');

  const handleSave = () => {
    if (firstRun && _apiKey.trim().length === 0) {
      addToast('error', t('noApiKeyWarning', { ns: 'api' }) as string);
      return;
    }
    setApiKey(_apiKey);
    setApiEndpoint(_apiEndpoint);
    setApiVersion(_apiVersion);
    setApiType(_apiType);
    setIsModalOpen(false);
  };

  const handleApiTypeChange = (newType: ApiType) => {
    _setApiType(newType);
    _setCustomEndpoint(false);
    _setApiEndpoint(
      newType === 'anthropic' ? anthropicAPIEndpoint : defaultAPIEndpoint
    );
  };

  const handleToggleCustomEndpoint = () => {
    if (_customEndpoint) _setApiEndpoint(defaultAPIEndpoint);
    else _setApiEndpoint('');
    _setCustomEndpoint((prev) => !prev);
  };

  return (
    <Dialog
      title={
        (firstRun ? t('setupApiKey', { ns: 'api' }) : t('api')) as string
      }
      setIsModalOpen={setIsModalOpen}
      handleConfirm={handleSave}
      cancelButton={!firstRun}
    >
      <div className='p-6 border-b border-[var(--border-mid)] flex flex-col gap-4'>
        <div>
          <label className='block text-sm font-medium text-[var(--fg)] mb-1.5'>
            {t('apiType.inputLabel', { ns: 'api' })}
          </label>
          <ApiTypeSelector
            _apiType={_apiType}
            onApiTypeChange={handleApiTypeChange}
          />
        </div>

        <Toggle
          label={t('customEndpoint', { ns: 'api' }) as string}
          isChecked={_customEndpoint}
          setIsChecked={() => handleToggleCustomEndpoint()}
          reversed
        />

        <div>
          <label className='block text-sm font-medium text-[var(--fg)] mb-1.5'>
            {t('apiEndpoint.inputLabel', { ns: 'api' })}
          </label>
          {_customEndpoint || _apiType === 'anthropic' ? (
            <input
              type='text'
              className='w-full text-[var(--fg)] px-3 py-2 text-sm bg-[var(--bg-hover)] border border-[var(--border-mid)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--focus)]'
              value={_apiEndpoint}
              onChange={(e) => {
                _setApiEndpoint(e.target.value);
              }}
            />
          ) : (
            <ApiEndpointSelector
              _apiEndpoint={_apiEndpoint}
              _setApiEndpoint={_setApiEndpoint}
            />
          )}
        </div>

        {_customEndpoint &&
          _apiType === 'openai' &&
          _apiEndpoint &&
          !_apiEndpoint.includes('openai.com') &&
          !_apiEndpoint.includes('openai.azure.com') && (
            <div className='px-3 py-2 rounded-md bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 text-xs flex items-start gap-1.5'>
              <svg
                width={14}
                height={14}
                viewBox='0 0 16 16'
                fill='none'
                style={{ display: 'inline', flexShrink: 0 }}
              >
                <path
                  d='M8 2L14.5 13H1.5L8 2Z'
                  stroke='currentColor'
                  strokeWidth='1.5'
                  strokeLinejoin='round'
                />
                <path
                  d='M8 7v3M8 11.5v.5'
                  stroke='currentColor'
                  strokeWidth='1.5'
                  strokeLinecap='round'
                />
              </svg>
              <span>
                {t('thirdPartyEndpointWarning', {
                  ns: 'api',
                  endpoint: _apiEndpoint,
                })}
              </span>
            </div>
          )}

        <div>
          <label className='block text-sm font-medium text-[var(--fg)] mb-1.5'>
            {t('apiKey.inputLabel', { ns: 'api' })}
          </label>
          <input
            type='text'
            className='w-full text-[var(--fg)] px-3 py-2 text-sm bg-[var(--bg-hover)] border border-[var(--border-mid)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--focus)]'
            value={_apiKey}
            onChange={(e) => {
              _setApiKey(e.target.value);
            }}
          />
        </div>

        {_apiType === 'openai' && isAzureEndpoint(_apiEndpoint) && (
          <div>
            <label className='block text-sm font-medium text-[var(--fg)] mb-1.5'>
              {t('apiVersion.inputLabel', { ns: 'api' })}
            </label>
            <input
              type='text'
              placeholder={t('apiVersion.description', { ns: 'api' }) ?? ''}
              className='w-full text-[var(--fg)] px-3 py-2 text-sm bg-[var(--bg-hover)] border border-[var(--border-mid)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--focus)]'
              value={_apiVersion}
              onChange={(e) => {
                _setApiVersion(e.target.value);
              }}
            />
          </div>
        )}

        <div className='text-[var(--fg-2)] text-sm leading-relaxed pt-1 border-t border-[var(--border-mid)]'>
          <p>
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
            />{' '}
            <span className='text-[var(--fg-3)]'>
              {t('apiKey.browserStorageNote', { ns: 'api' })}
            </span>
          </p>
          {firstRun && (
            <p className='mt-2 text-[var(--fg-3)]'>
              {t('securityMessage', { ns: 'api' })}
            </p>
          )}
        </div>
      </div>
    </Dialog>
  );
};

const ApiTypeSelector = ({
  _apiType,
  onApiTypeChange,
}: {
  _apiType: ApiType;
  onApiTypeChange: (type: ApiType) => void;
}) => {
  const { t } = useTranslation('api');

  const options: { value: string; label: string }[] = [
    { value: 'openai', label: t('apiType.openai') },
    { value: 'anthropic', label: t('apiType.anthropic') },
  ];

  return (
    <Select
      value={_apiType}
      options={options}
      onChange={(e) => onApiTypeChange(e.target.value as ApiType)}
      aria-label='api type selector'
    />
  );
};

const ApiEndpointSelector = ({
  _apiEndpoint,
  _setApiEndpoint,
}: {
  _apiEndpoint: string;
  _setApiEndpoint: React.Dispatch<React.SetStateAction<string>>;
}) => {
  const options = availableEndpoints.map((ep) => ({ value: ep, label: ep }));

  return (
    <Select
      value={_apiEndpoint}
      options={options}
      onChange={(e) => _setApiEndpoint(e.target.value)}
      aria-label='api endpoint selector'
    />
  );
};

export default ApiMenu;
