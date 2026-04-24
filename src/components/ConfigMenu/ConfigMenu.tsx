import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Dialog from '@components/Dialog';
import { ConfigInterface, ImageDetail } from '@type/chat';
import Combobox from '@components/Combobox';
import { modelOptions, modelMaxToken } from '@constants/modelLoader';
import { ModelOptions } from '@utils/modelReader';
import useStore from '@store/store';

const ConfigMenu = ({
  setIsModalOpen,
  config,
  setConfig,
  imageDetail,
  setImageDetail,
}: {
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  config: ConfigInterface;
  setConfig: (config: ConfigInterface) => void;
  imageDetail: ImageDetail;
  setImageDetail: (imageDetail: ImageDetail) => void;
}) => {
  const [_maxToken, _setMaxToken] = useState<number>(config.max_tokens);
  const [_model, _setModel] = useState<ModelOptions>(config.model);
  const [_temperature, _setTemperature] = useState<number>(config.temperature);
  const [_presencePenalty, _setPresencePenalty] = useState<number>(
    config.presence_penalty
  );
  const [_topP, _setTopP] = useState<number>(config.top_p);
  const [_frequencyPenalty, _setFrequencyPenalty] = useState<number>(
    config.frequency_penalty
  );
  const [_imageDetail, _setImageDetail] = useState<ImageDetail>(imageDetail);
  const { t } = useTranslation('model');

  const handleConfirm = () => {
    setConfig({
      max_tokens: _maxToken,
      model: _model,
      temperature: _temperature,
      presence_penalty: _presencePenalty,
      top_p: _topP,
      frequency_penalty: _frequencyPenalty,
    });
    setImageDetail(_imageDetail);
    setIsModalOpen(false);
  };

  return (
    <Dialog
      title={t('configuration') as string}
      setIsModalOpen={setIsModalOpen}
      handleConfirm={handleConfirm}
      handleClickBackdrop={handleConfirm}
    >
      <div className='p-6 border-b border-[var(--border-mid)]'>
        <ModelSelector
          _model={_model}
          _setModel={_setModel}
          _label={t('Model')}
        />
        <MaxTokenSlider
          _maxToken={_maxToken}
          _setMaxToken={_setMaxToken}
          _model={_model}
        />
        <TemperatureSlider
          _temperature={_temperature}
          _setTemperature={_setTemperature}
        />
        <TopPSlider _topP={_topP} _setTopP={_setTopP} />
        <PresencePenaltySlider
          _presencePenalty={_presencePenalty}
          _setPresencePenalty={_setPresencePenalty}
        />
        <FrequencyPenaltySlider
          _frequencyPenalty={_frequencyPenalty}
          _setFrequencyPenalty={_setFrequencyPenalty}
        />
        <ImageDetailSelector
          _imageDetail={_imageDetail}
          _setImageDetail={_setImageDetail}
        />
      </div>
    </Dialog>
  );
};

export const ModelSelector = ({
  _model,
  _setModel,
  _label,
}: {
  _model: ModelOptions;
  _setModel: React.Dispatch<React.SetStateAction<ModelOptions>>;
  _label: string;
}) => {
  const { t } = useTranslation(['main', 'model']);
  const [localModelOptions, setLocalModelOptions] =
    useState<string[]>(modelOptions);
  const customModels = useStore((state) => state.customModels);

  // Update model options when custom models change
  useEffect(() => {
    const customModelIds = customModels.map((model) => model.id);
    const defaultModelIds = modelOptions.filter(
      (id) => !customModelIds.includes(id)
    );
    setLocalModelOptions([...customModelIds, ...defaultModelIds]);
  }, [customModels]);

  const modelOptionsFormatted = Array.from(new Set(localModelOptions)).map(
    (model) => {
    const isCustom = customModels.some((m) => m.id === model);
    const customModel = customModels.find((m) => m.id === model);
    return {
      value: model,
      label: isCustom
        ? `${customModel?.name} ${t('customModels.customLabel', { ns: 'model' })}`
        : model,
    };
  });

  return (
    <div className='mb-4'>
      <label className='block text-sm font-medium text-[var(--fg)] mb-1.5'>
        {_label}
      </label>
      <Combobox
        value={_model}
        onChange={(v) => _setModel(v as ModelOptions)}
        options={modelOptionsFormatted}
        ariaLabel='model selector'
      />
    </div>
  );
};

export const MaxTokenSlider = ({
  _maxToken,
  _setMaxToken,
  _model,
}: {
  _maxToken: number;
  _setMaxToken: React.Dispatch<React.SetStateAction<number>>;
  _model: ModelOptions;
}) => {
  const { t } = useTranslation('model');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef &&
      inputRef.current &&
      _setMaxToken(Number(inputRef.current.value));
  }, [_model]);

  return (
    <div className='mt-5 pt-5 border-t border-[var(--border-mid)]'>
      <label className='block text-sm font-medium text-[var(--fg)]'>
        {t('token.label')}: {_maxToken}
      </label>
      <input
        type='range'
        ref={inputRef}
        value={_maxToken}
        onChange={(e) => {
          _setMaxToken(Number(e.target.value));
        }}
        min={0}
        max={modelMaxToken[_model]}
        step={1}
        className='w-full h-2 bg-[var(--bg-sand)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]'
      />
      <div className='min-w-fit text-[var(--fg-3)] text-sm mt-2'>
        {t('token.description')}
      </div>
    </div>
  );
};

export const TemperatureSlider = ({
  _temperature,
  _setTemperature,
}: {
  _temperature: number;
  _setTemperature: React.Dispatch<React.SetStateAction<number>>;
}) => {
  const { t } = useTranslation('model');

  return (
    <div className='mt-5 pt-5 border-t border-[var(--border-mid)]'>
      <label className='block text-sm font-medium text-[var(--fg)]'>
        {t('temperature.label')}: {_temperature}
      </label>
      <input
        id='default-range'
        type='range'
        value={_temperature}
        onChange={(e) => {
          _setTemperature(Number(e.target.value));
        }}
        min={0}
        max={2}
        step={0.1}
        className='w-full h-2 bg-[var(--bg-sand)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]'
      />
      <div className='min-w-fit text-[var(--fg-3)] text-sm mt-2'>
        {t('temperature.description')}
      </div>
    </div>
  );
};

export const TopPSlider = ({
  _topP,
  _setTopP,
}: {
  _topP: number;
  _setTopP: React.Dispatch<React.SetStateAction<number>>;
}) => {
  const { t } = useTranslation('model');

  return (
    <div className='mt-5 pt-5 border-t border-[var(--border-mid)]'>
      <label className='block text-sm font-medium text-[var(--fg)]'>
        {t('topP.label')}: {_topP}
      </label>
      <input
        id='default-range'
        type='range'
        value={_topP}
        onChange={(e) => {
          _setTopP(Number(e.target.value));
        }}
        min={0}
        max={1}
        step={0.05}
        className='w-full h-2 bg-[var(--bg-sand)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]'
      />
      <div className='min-w-fit text-[var(--fg-3)] text-sm mt-2'>
        {t('topP.description')}
      </div>
    </div>
  );
};

export const PresencePenaltySlider = ({
  _presencePenalty,
  _setPresencePenalty,
}: {
  _presencePenalty: number;
  _setPresencePenalty: React.Dispatch<React.SetStateAction<number>>;
}) => {
  const { t } = useTranslation('model');

  return (
    <div className='mt-5 pt-5 border-t border-[var(--border-mid)]'>
      <label className='block text-sm font-medium text-[var(--fg)]'>
        {t('presencePenalty.label')}: {_presencePenalty}
      </label>
      <input
        id='default-range'
        type='range'
        value={_presencePenalty}
        onChange={(e) => {
          _setPresencePenalty(Number(e.target.value));
        }}
        min={-2}
        max={2}
        step={0.1}
        className='w-full h-2 bg-[var(--bg-sand)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]'
      />
      <div className='min-w-fit text-[var(--fg-3)] text-sm mt-2'>
        {t('presencePenalty.description')}
      </div>
    </div>
  );
};

export const FrequencyPenaltySlider = ({
  _frequencyPenalty,
  _setFrequencyPenalty,
}: {
  _frequencyPenalty: number;
  _setFrequencyPenalty: React.Dispatch<React.SetStateAction<number>>;
}) => {
  const { t } = useTranslation('model');

  return (
    <div className='mt-5 pt-5 border-t border-[var(--border-mid)]'>
      <label className='block text-sm font-medium text-[var(--fg)]'>
        {t('frequencyPenalty.label')}: {_frequencyPenalty}
      </label>
      <input
        id='default-range'
        type='range'
        value={_frequencyPenalty}
        onChange={(e) => {
          _setFrequencyPenalty(Number(e.target.value));
        }}
        min={-2}
        max={2}
        step={0.1}
        className='w-full h-2 bg-[var(--bg-sand)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]'
      />
      <div className='min-w-fit text-[var(--fg-3)] text-sm mt-2'>
        {t('frequencyPenalty.description')}
      </div>
    </div>
  );
};

export const ImageDetailSelector = ({
  _imageDetail,
  _setImageDetail,
}: {
  _imageDetail: ImageDetail;
  _setImageDetail: React.Dispatch<React.SetStateAction<ImageDetail>>;
}) => {
  const { t } = useTranslation('model');

  const imageDetailOptions: { value: ImageDetail; labelKey: string }[] = [
    { value: 'auto', labelKey: 'imageDetail.auto' },
    { value: 'low', labelKey: 'imageDetail.low' },
    { value: 'high', labelKey: 'imageDetail.high' },
  ];

  return (
    <div className='mt-5 pt-5 border-t border-[var(--border-mid)]'>
      <label className='block text-sm font-medium text-[var(--fg)] mb-2'>
        {t('imageDetail.label')}
      </label>
      <div className='flex gap-2 flex-wrap'>
        {imageDetailOptions.map(({ value, labelKey }) => (
          <button
            key={value}
            type='button'
            onClick={() => _setImageDetail(value)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              _imageDetail === value
                ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-fg)]'
                : 'border-[var(--border-mid)] text-[var(--fg-2)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ConfigMenu;
