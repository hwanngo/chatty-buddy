import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Select from 'react-select';
import useStore from '@store/store';

import PopupModal from '@components/PopupModal';

const inputClass =
  'w-full text-[#141413] dark:text-[#faf9f5] px-3 py-2 bg-[#f5f3ec] dark:bg-[#242422] border border-[#e8e6dc] dark:border-[#3d3d3a] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c96442] text-sm';

const labelClass =
  'block text-xs font-medium text-[#87867f] dark:text-[#6b6a65] mb-1';

const sectionLabelClass =
  'text-xs font-semibold uppercase tracking-wider text-[#87867f] dark:text-[#6b6a65] mb-3';

const CustomModelsManager = () => {
  const { t } = useTranslation('model');
  const theme = useStore((state) => state.theme);
  const isDark = theme === 'dark';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newModelId, setNewModelId] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [newModelModality, setNewModelModality] = useState<
    'text->text' | 'text+image->text'
  >('text->text');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [contextLength, setContextLength] = useState(128000);
  const [maxCompletionTokens, setMaxCompletionTokens] = useState(16384);
  const [isStreamSupported, setIsStreamSupported] = useState(true);
  const [pricing, setPricing] = useState({
    completion: '0.00001',
    image: '0.003613',
    prompt: '0.0000025',
    request: '0',
  });

  const customModels = useStore((state) => state.customModels);
  const addCustomModel = useStore((state) => state.addCustomModel);
  const removeCustomModel = useStore((state) => state.removeCustomModel);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newModelId && newModelName) {
      addCustomModel({
        id: newModelId,
        name: newModelName,
        architecture: {
          modality: newModelModality,
          tokenizer: 'cl100k_base',
          instruct_type: null,
        },
        context_length: contextLength,
        pricing: pricing,
        is_stream_supported: isStreamSupported,
      });
      setNewModelId('');
      setNewModelName('');
      setNewModelModality('text->text');
      setShowAdvanced(false);
      setContextLength(128000);
      setMaxCompletionTokens(16384);
      setIsStreamSupported(true);
      setPricing({
        completion: '0.00001',
        image: '0.003613',
        prompt: '0.0000025',
        request: '0',
      });
    }
  };

  return (
    <div>
      <button className='btn btn-neutral' onClick={() => setIsModalOpen(true)}>
        {t('customModels.title') || ''}
      </button>

      {isModalOpen && (
        <PopupModal
          setIsModalOpen={setIsModalOpen}
          title={t('customModels.title') || ''}
          cancelButton={true}
        >
          <div className='w-[min(90vw,28rem)] text-sm text-[#141413] dark:text-[#faf9f5]'>
            {/* Add model form */}
            <div className='px-6 py-5 border-b border-[#e8e6dc] dark:border-[#30302e]'>
              <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
                <div>
                  <label className={labelClass}>
                    {t('customModels.modelId') || ''}
                  </label>
                  <input
                    type='text'
                    placeholder={t('customModels.modelId') || ''}
                    value={newModelId}
                    onChange={(e) => setNewModelId(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    {t('customModels.modelName') || ''}
                  </label>
                  <input
                    type='text'
                    placeholder={t('customModels.modelName') || ''}
                    value={newModelName}
                    onChange={(e) => setNewModelName(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    {t('customModels.modality') || ''}
                  </label>
                  <Select
                    value={{
                      value: newModelModality,
                      label:
                        newModelModality === 'text->text'
                          ? t('customModels.textOnly') || ''
                          : t('customModels.textAndImage') || '',
                    }}
                    options={[
                      {
                        value: 'text->text' as const,
                        label: t('customModels.textOnly') || '',
                      },
                      {
                        value: 'text+image->text' as const,
                        label: t('customModels.textAndImage') || '',
                      },
                    ]}
                    onChange={(selected) =>
                      selected &&
                      setNewModelModality(
                        selected.value as 'text->text' | 'text+image->text'
                      )
                    }
                    isSearchable={false}
                    menuPortalTarget={document.body}
                    menuPosition='fixed'
                    styles={{
                      container: (base) => ({
                        ...base,
                        fontSize: '14px',
                        fontFamily:
                          "'DM Sans', ui-sans-serif, system-ui, sans-serif",
                      }),
                      control: (base) => ({
                        ...base,
                        'backgroundColor': isDark ? '#242422' : '#f5f3ec',
                        'borderColor': isDark ? '#3d3d3a' : '#e8e6dc',
                        'color': isDark ? '#faf9f5' : '#141413',
                        '&:hover': {
                          borderColor: isDark ? '#b0aea5' : '#5e5d59',
                        },
                        'boxShadow': 'none',
                        'minHeight': '36px',
                      }),
                      menu: (base) => ({
                        ...base,
                        backgroundColor: isDark ? '#30302e' : '#faf9f5',
                        border: `1px solid ${isDark ? '#3d3d3a' : '#e8e6dc'}`,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
                        borderRadius: '8px',
                        zIndex: 50,
                      }),
                      option: (base, state) => ({
                        ...base,
                        'backgroundColor': state.isSelected
                          ? '#c96442'
                          : state.isFocused
                            ? isDark
                              ? '#3a3a37'
                              : '#f0eee6'
                            : 'transparent',
                        'color': state.isSelected
                          ? '#faf9f5'
                          : isDark
                            ? '#faf9f5'
                            : '#141413',
                        '&:active': {
                          backgroundColor: '#c96442',
                          color: '#faf9f5',
                        },
                        'fontSize': '14px',
                      }),
                      singleValue: (base) => ({
                        ...base,
                        color: isDark ? '#faf9f5' : '#141413',
                      }),
                      indicatorSeparator: () => ({ display: 'none' }),
                      dropdownIndicator: (base) => ({
                        ...base,
                        'color': isDark ? '#b0aea5' : '#5e5d59',
                        '&:hover': { color: isDark ? '#faf9f5' : '#141413' },
                        'padding': '0 8px',
                      }),
                      menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                    }}
                  />
                </div>

                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-[#141413] dark:text-[#faf9f5]'>
                      {t('customModels.streamSupported') || ''}
                    </p>
                    <p className='text-xs text-[#87867f] dark:text-[#6b6a65]'>
                      {t('customModels.streamSupportedDescription') || ''}
                    </p>
                  </div>
                  <button
                    type='button'
                    role='switch'
                    aria-checked={isStreamSupported}
                    onClick={() => setIsStreamSupported(!isStreamSupported)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isStreamSupported
                        ? 'bg-[#c96442]'
                        : 'bg-[#e8e6dc] dark:bg-[#3d3d3a]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isStreamSupported ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <button
                  type='button'
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className='text-left text-sm font-medium text-[#c96442] hover:text-[#b55a3c] transition-colors focus:outline-none'
                >
                  {showAdvanced
                    ? t('customModels.hideAdvanced') || ''
                    : t('customModels.showAdvanced') || ''}
                </button>

                {showAdvanced && (
                  <div className='flex flex-col gap-4 border-t border-[#e8e6dc] dark:border-[#30302e] pt-4'>
                    <p className={sectionLabelClass}>
                      {t('customModels.advancedSettings') || ''}
                    </p>

                    <div>
                      <label className={labelClass}>
                        {t('customModels.contextLength') || ''}
                      </label>
                      <input
                        type='number'
                        value={contextLength}
                        onChange={(e) =>
                          setContextLength(Number(e.target.value))
                        }
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>
                        {t('customModels.maxCompletionTokens') || ''}
                      </label>
                      <input
                        type='number'
                        value={maxCompletionTokens}
                        onChange={(e) =>
                          setMaxCompletionTokens(Number(e.target.value))
                        }
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <p className={sectionLabelClass}>
                        {t('customModels.pricing') || ''}
                      </p>
                      <div className='grid grid-cols-2 gap-3'>
                        <div>
                          <label className={labelClass}>
                            {t('customModels.promptPrice') || ''}
                          </label>
                          <input
                            type='number'
                            step='0.000001'
                            value={pricing.prompt}
                            onChange={(e) =>
                              setPricing({ ...pricing, prompt: e.target.value })
                            }
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>
                            {t('customModels.completionPrice') || ''}
                          </label>
                          <input
                            type='number'
                            step='0.000001'
                            value={pricing.completion}
                            onChange={(e) =>
                              setPricing({
                                ...pricing,
                                completion: e.target.value,
                              })
                            }
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>
                            {t('customModels.imagePrice') || ''}
                          </label>
                          <input
                            type='number'
                            step='0.000001'
                            value={pricing.image}
                            onChange={(e) =>
                              setPricing({ ...pricing, image: e.target.value })
                            }
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>
                            {t('customModels.requestPrice') || ''}
                          </label>
                          <input
                            type='number'
                            step='0.000001'
                            value={pricing.request}
                            onChange={(e) =>
                              setPricing({
                                ...pricing,
                                request: e.target.value,
                              })
                            }
                            className={inputClass}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type='submit'
                  className='btn btn-primary w-full justify-center'
                >
                  {t('customModels.addModel') || ''}
                </button>
              </form>
            </div>

            {/* Your custom models list */}
            <div className='px-6 py-5'>
              <p className={sectionLabelClass}>
                {t('customModels.yourCustomModels') || ''}
              </p>
              {customModels.length === 0 ? (
                <p className='text-[#87867f] dark:text-[#6b6a65] text-sm py-2'>
                  {t('customModels.noModels') || ''}
                </p>
              ) : (
                <ul className='flex flex-col gap-2'>
                  {customModels.map((model) => (
                    <li
                      key={model.id}
                      className='flex items-center justify-between px-3 py-2 bg-[#f5f3ec] dark:bg-[#242422] border border-[#e8e6dc] dark:border-[#3d3d3a] rounded-lg'
                    >
                      <div>
                        <p className='text-sm font-medium text-[#141413] dark:text-[#faf9f5]'>
                          {model.name}
                        </p>
                        <p className='text-xs text-[#87867f] dark:text-[#6b6a65]'>
                          {model.id}
                        </p>
                      </div>
                      <button
                        onClick={() => removeCustomModel(model.id)}
                        className='text-xs px-2 py-1 text-[#b53333] hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors cursor-pointer'
                      >
                        {t('customModels.remove') || ''}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </PopupModal>
      )}
    </div>
  );
};

export default CustomModelsManager;
