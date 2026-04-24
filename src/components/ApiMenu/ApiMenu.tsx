import React, { useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import useStore from '@store/store';
import Select from 'react-select';

import PopupModal from '@components/PopupModal';
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
}: {
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
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
  const [_apiType, _setApiType] = useState<ApiType>(apiType ?? 'openai');

  const handleSave = () => {
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
    <PopupModal
      title={t('api') as string}
      setIsModalOpen={setIsModalOpen}
      handleConfirm={handleSave}
    >
      <div className='p-6 border-b border-[#e8e6dc] dark:border-[#3d3d3a] flex flex-col gap-4'>
        <div>
          <label className='block text-sm font-medium text-[#141413] dark:text-[#faf9f5] mb-1.5'>
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
          <label className='block text-sm font-medium text-[#141413] dark:text-[#faf9f5] mb-1.5'>
            {t('apiEndpoint.inputLabel', { ns: 'api' })}
          </label>
          {_customEndpoint || _apiType === 'anthropic' ? (
            <input
              type='text'
              className='w-full text-[#141413] dark:text-[#faf9f5] px-3 py-2 text-sm bg-[#f0eee6] dark:bg-[#30302e] border border-[#e8e6dc] dark:border-[#3d3d3a] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3898ec]'
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

        {_apiType === 'openai' && isAzureEndpoint(_apiEndpoint) && (
          <div>
            <label className='block text-sm font-medium text-[#141413] dark:text-[#faf9f5] mb-1.5'>
              {t('apiVersion.inputLabel', { ns: 'api' })}
            </label>
            <input
              type='text'
              placeholder={t('apiVersion.description', { ns: 'api' }) ?? ''}
              className='w-full text-[#141413] dark:text-[#faf9f5] px-3 py-2 text-sm bg-[#f0eee6] dark:bg-[#30302e] border border-[#e8e6dc] dark:border-[#3d3d3a] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3898ec]'
              value={_apiVersion}
              onChange={(e) => {
                _setApiVersion(e.target.value);
              }}
            />
          </div>
        )}

        <div className='text-[#5e5d59] dark:text-[#b0aea5] text-sm leading-relaxed pt-1 border-t border-[#e8e6dc] dark:border-[#3d3d3a]'>
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
            <span className='text-[#87867f] dark:text-[#5e5d59]'>
              {t('apiKey.browserStorageNote', { ns: 'api' })}
            </span>
          </p>
        </div>
      </div>
    </PopupModal>
  );
};

const buildSelectStyles = (isDark: boolean) => ({
  container: (base: Record<string, unknown>) => ({
    ...base,
    fontSize: '14px',
    fontWeight: '400',
    fontFamily: "'DM Sans', ui-sans-serif, system-ui, sans-serif",
  }),
  control: (base: Record<string, unknown>) => ({
    ...base,
    'backgroundColor': isDark ? '#30302e' : '#f0eee6',
    'borderColor': isDark ? '#3d3d3a' : '#e8e6dc',
    'color': isDark ? '#faf9f5' : '#141413',
    '&:hover': { borderColor: isDark ? '#b0aea5' : '#5e5d59' },
    'boxShadow': 'none',
    'borderRadius': '8px',
  }),
  menu: (base: Record<string, unknown>) => ({
    ...base,
    backgroundColor: isDark ? '#30302e' : '#faf9f5',
    border: `1px solid ${isDark ? '#3d3d3a' : '#e8e6dc'}`,
    boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
    borderRadius: '8px',
    zIndex: 50,
  }),
  option: (
    base: Record<string, unknown>,
    state: { isSelected: boolean; isFocused: boolean }
  ) => ({
    ...base,
    'backgroundColor': state.isSelected
      ? '#c96442'
      : state.isFocused
        ? isDark
          ? '#3a3a37'
          : '#f0eee6'
        : 'transparent',
    'color': state.isSelected ? '#faf9f5' : isDark ? '#faf9f5' : '#141413',
    '&:active': { backgroundColor: '#c96442', color: '#faf9f5' },
  }),
  singleValue: (base: Record<string, unknown>) => ({
    ...base,
    color: isDark ? '#faf9f5' : '#141413',
  }),
  input: (base: Record<string, unknown>) => ({
    ...base,
    color: isDark ? '#faf9f5' : '#141413',
  }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (base: Record<string, unknown>) => ({
    ...base,
    'color': isDark ? '#b0aea5' : '#5e5d59',
    '&:hover': { color: isDark ? '#faf9f5' : '#141413' },
    'padding': '0 8px',
  }),
  menuPortal: (base: Record<string, unknown>) => ({ ...base, zIndex: 9999 }),
});

const ApiTypeSelector = ({
  _apiType,
  onApiTypeChange,
}: {
  _apiType: ApiType;
  onApiTypeChange: (type: ApiType) => void;
}) => {
  const { t } = useTranslation('api');
  const theme = useStore((state) => state.theme);
  const isDark = theme === 'dark';

  const options: { value: ApiType; label: string }[] = [
    { value: 'openai', label: t('apiType.openai') },
    { value: 'anthropic', label: t('apiType.anthropic') },
  ];
  const currentValue = options.find((o) => o.value === _apiType) ?? options[0];

  return (
    <Select
      value={currentValue}
      options={options}
      onChange={(selected) => selected && onApiTypeChange(selected.value)}
      styles={buildSelectStyles(isDark)}
      isSearchable={false}
      menuPortalTarget={document.body}
      menuPosition='fixed'
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
  const theme = useStore((state) => state.theme);
  const isDark = theme === 'dark';

  const options = availableEndpoints.map((ep) => ({ value: ep, label: ep }));
  const currentValue =
    options.find((o) => o.value === _apiEndpoint) ?? options[0];

  return (
    <Select
      value={currentValue}
      options={options}
      onChange={(selected) => selected && _setApiEndpoint(selected.value)}
      styles={buildSelectStyles(isDark)}
      isSearchable={false}
      menuPortalTarget={document.body}
      menuPosition='fixed'
      aria-label='api endpoint selector'
    />
  );
};

export default ApiMenu;
