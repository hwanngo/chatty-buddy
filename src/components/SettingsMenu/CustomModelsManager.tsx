import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Select from '@components/Select';
import useStore from '@store/store';

import Dialog from '@components/Dialog';

const inputClass =
  'w-full text-[var(--fg)] px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-mid)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm';

const labelClass = 'block text-xs font-medium text-[var(--fg-3)] mb-1';

const sectionLabelClass =
  'text-xs font-semibold uppercase tracking-wider text-[var(--fg-3)] mb-3';

const CustomModelsManager = () => {
  const { t } = useTranslation('model');
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
        <Dialog
          setIsModalOpen={setIsModalOpen}
          title={t('customModels.title') || ''}
          cancelButton={true}
        >
          <div className='w-[min(90vw,28rem)] text-sm text-[var(--fg)]'>
            {/* Add model form */}
            <div className='px-6 py-5 border-b border-[var(--border-mid)]'>
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
                    value={newModelModality}
                    options={[
                      {
                        value: 'text->text',
                        label: t('customModels.textOnly') || '',
                      },
                      {
                        value: 'text+image->text',
                        label: t('customModels.textAndImage') || '',
                      },
                    ]}
                    onChange={(e) =>
                      setNewModelModality(
                        e.target.value as 'text->text' | 'text+image->text'
                      )
                    }
                    aria-label='modality'
                  />
                </div>

                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-[var(--fg)]'>
                      {t('customModels.streamSupported') || ''}
                    </p>
                    <p className='text-xs text-[var(--fg-3)]'>
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
                        ? 'bg-[var(--accent)]'
                        : 'bg-[var(--border-mid)]'
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
                  className='text-left text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors focus:outline-none'
                >
                  {showAdvanced
                    ? t('customModels.hideAdvanced') || ''
                    : t('customModels.showAdvanced') || ''}
                </button>

                {showAdvanced && (
                  <div className='flex flex-col gap-4 border-t border-[var(--border-mid)] pt-4'>
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
                <p className='text-[var(--fg-3)] text-sm py-2'>
                  {t('customModels.noModels') || ''}
                </p>
              ) : (
                <ul className='flex flex-col gap-2'>
                  {customModels.map((model) => (
                    <li
                      key={model.id}
                      className='flex items-center justify-between px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-mid)] rounded-lg'
                    >
                      <div>
                        <p className='text-sm font-medium text-[var(--fg)]'>
                          {model.name}
                        </p>
                        <p className='text-xs text-[var(--fg-3)]'>
                          {model.id}
                        </p>
                      </div>
                      <button
                        onClick={() => removeCustomModel(model.id)}
                        className='text-xs px-2 py-1 text-[var(--error)] hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors cursor-pointer'
                      >
                        {t('customModels.remove') || ''}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};

export default CustomModelsManager;
