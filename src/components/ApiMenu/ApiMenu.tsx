import React, { useState, useId } from 'react';
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
import { reloadModels } from '@constants/modelLoader';

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
  const fieldId = useId();
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');
  const [_apiType, _setApiType] = useState<ApiType>(apiType ?? 'openai');

  const handleSave = () => {
    let endpoint: URL;
    try {
      endpoint = new URL(_apiEndpoint.trim());
      if (
        !['https:', 'http:'].includes(endpoint.protocol) ||
        endpoint.username ||
        endpoint.password
      )
        throw new Error();
    } catch {
      setError(t('invalidEndpoint', { ns: 'api' }));
      return;
    }
    if (
      ['api.openai.com', 'api.anthropic.com'].includes(endpoint.hostname) &&
      !_apiKey.trim()
    ) {
      setError(t('noApiKeyWarning', { ns: 'api' }));
      return;
    }
    setError('');
    setApiKey(_apiKey);
    setApiEndpoint(_apiEndpoint.trim());
    setApiVersion(_apiVersion);
    setApiType(_apiType);
    // The new endpoint may serve an entirely different set of models; refresh
    // the picker in the background rather than making the user reload.
    void reloadModels();
    setIsModalOpen(false);
  };

  const handleApiTypeChange = (newType: ApiType) => {
    _setApiType(newType);
    _setCustomEndpoint(false);
    // Ollama has no canonical public host — it is always someone's own
    // machine — so start blank and let them paste it, rather than seeding a
    // default that is wrong for everyone.
    _setApiEndpoint(
      newType === 'anthropic'
        ? anthropicAPIEndpoint
        : newType === 'ollama'
          ? ''
          : defaultAPIEndpoint
    );
  };

  const handleToggleCustomEndpoint = () => {
    if (_customEndpoint) _setApiEndpoint(defaultAPIEndpoint);
    else _setApiEndpoint('');
    _setCustomEndpoint((prev) => !prev);
  };

  return (
    <Dialog
      title={(firstRun ? t('setupApiKey', { ns: 'api' }) : t('api')) as string}
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
          <label
            htmlFor={`${fieldId}-endpoint`}
            className='block text-sm font-medium text-[var(--fg)] mb-1.5'
          >
            {t('apiEndpoint.inputLabel', { ns: 'api' })}
          </label>
          {_customEndpoint ||
          _apiType === 'anthropic' ||
          _apiType === 'ollama' ? (
            <input
              id={`${fieldId}-endpoint`}
              type='url'
              aria-describedby={error ? `${fieldId}-error` : undefined}
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

        {_apiEndpoint && (
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
          <label
            htmlFor={`${fieldId}-key`}
            className='block text-sm font-medium text-[var(--fg)] mb-1.5'
          >
            {t('apiKey.inputLabel', { ns: 'api' })}
          </label>
          <input
            id={`${fieldId}-key`}
            type={showKey ? 'text' : 'password'}
            autoComplete='off'
            spellCheck={false}
            className='w-full text-[var(--fg)] px-3 py-2 text-sm bg-[var(--bg-hover)] border border-[var(--border-mid)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--focus)]'
            value={_apiKey}
            onChange={(e) => {
              _setApiKey(e.target.value);
            }}
          />
          <button
            type='button'
            className='mt-2 text-sm text-[var(--accent)]'
            aria-pressed={showKey}
            onClick={() => setShowKey(!showKey)}
          >
            {t(showKey ? 'hideKey' : 'showKey', { ns: 'api' })}
          </button>
          {error && (
            <p
              id={`${fieldId}-error`}
              role='alert'
              className='mt-2 text-sm text-[var(--error)]'
            >
              {error}
            </p>
          )}
        </div>

        {_apiType === 'openai' && isAzureEndpoint(_apiEndpoint) && (
          <div>
            <label className='block text-sm font-medium text-[var(--fg)] mb-1.5'>
              {t('apiVersion.inputLabel', { ns: 'api' })}
            </label>
            <input
              type='text'
              aria-label={t('apiVersion.inputLabel', { ns: 'api' })}
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
            {_apiType !== 'ollama' && (
              <Trans
                i18nKey='apiKey.howTo'
                ns='api'
                components={[
                  <a
                    href={
                      _apiType === 'anthropic'
                        ? 'https://console.anthropic.com/settings/keys'
                        : 'https://platform.openai.com/api-keys'
                    }
                    className='link'
                    target='_blank'
                  />,
                ]}
              />
            )}{' '}
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
    { value: 'ollama', label: t('apiType.ollama') },
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
