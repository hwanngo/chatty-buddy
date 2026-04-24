import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PopupModal from '@components/PopupModal';
import { ConfigInterface, ImageDetail } from '@type/chat';
import Select from 'react-select';
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
    <PopupModal
      title={t('configuration') as string}
      setIsModalOpen={setIsModalOpen}
      handleConfirm={handleConfirm}
      handleClickBackdrop={handleConfirm}
    >
      <div className='p-6 border-b border-[#e8e6dc] dark:border-[#3d3d3a]'>
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
    </PopupModal>
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
  const theme = useStore((state) => state.theme);
  const isDark = theme === 'dark';

  // Update model options when custom models change
  useEffect(() => {
    const customModelIds = customModels.map((model) => model.id);
    const defaultModelIds = modelOptions.filter(
      (id) => !customModelIds.includes(id)
    );
    setLocalModelOptions([...customModelIds, ...defaultModelIds]);
  }, [customModels]);

  const modelOptionsFormatted = localModelOptions.map((model) => {
    const isCustom = customModels.some((m) => m.id === model);
    const customModel = customModels.find((m) => m.id === model);
    return {
      value: model,
      label: isCustom
        ? `${customModel?.name} ${t('customModels.customLabel', { ns: 'model' })}`
        : model,
    };
  });

  const customStyles = {
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
    placeholder: (base: Record<string, unknown>) => ({
      ...base,
      color: '#87867f',
    }),
    indicatorSeparator: () => ({ display: 'none' }),
    dropdownIndicator: (base: Record<string, unknown>) => ({
      ...base,
      'color': isDark ? '#b0aea5' : '#5e5d59',
      '&:hover': { color: isDark ? '#faf9f5' : '#141413' },
    }),
    menuPortal: (base: Record<string, unknown>) => ({ ...base, zIndex: 9999 }),
  };

  return (
    <div className='mb-4'>
      <label className='block text-sm font-medium text-[#141413] dark:text-[#faf9f5] mb-1.5'>
        {_label}
      </label>
      <Select
        value={{
          value: _model,
          label: customModels.some((m) => m.id === _model)
            ? `${customModels.find((m) => m.id === _model)?.name} ${t('customModels.customLabel', { ns: 'model' })}`
            : _model,
        }}
        onChange={(selectedOption) =>
          _setModel(selectedOption?.value as ModelOptions)
        }
        options={modelOptionsFormatted}
        className='basic-single'
        classNamePrefix='select'
        styles={customStyles}
        menuPortalTarget={document.body}
        menuPosition='fixed'
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
    <div className='mt-5 pt-5 border-t border-[#e8e6dc] dark:border-[#3d3d3a]'>
      <label className='block text-sm font-medium text-[#141413] dark:text-[#faf9f5]'>
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
        className='w-full h-2 bg-[#e8e6dc] dark:bg-[#3d3d3a] rounded-lg appearance-none cursor-pointer accent-[#c96442]'
      />
      <div className='min-w-fit text-[#87867f] text-sm mt-2'>
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
    <div className='mt-5 pt-5 border-t border-[#e8e6dc] dark:border-[#3d3d3a]'>
      <label className='block text-sm font-medium text-[#141413] dark:text-[#faf9f5]'>
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
        className='w-full h-2 bg-[#e8e6dc] dark:bg-[#3d3d3a] rounded-lg appearance-none cursor-pointer accent-[#c96442]'
      />
      <div className='min-w-fit text-[#87867f] text-sm mt-2'>
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
    <div className='mt-5 pt-5 border-t border-[#e8e6dc] dark:border-[#3d3d3a]'>
      <label className='block text-sm font-medium text-[#141413] dark:text-[#faf9f5]'>
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
        className='w-full h-2 bg-[#e8e6dc] dark:bg-[#3d3d3a] rounded-lg appearance-none cursor-pointer accent-[#c96442]'
      />
      <div className='min-w-fit text-[#87867f] text-sm mt-2'>
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
    <div className='mt-5 pt-5 border-t border-[#e8e6dc] dark:border-[#3d3d3a]'>
      <label className='block text-sm font-medium text-[#141413] dark:text-[#faf9f5]'>
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
        className='w-full h-2 bg-[#e8e6dc] dark:bg-[#3d3d3a] rounded-lg appearance-none cursor-pointer accent-[#c96442]'
      />
      <div className='min-w-fit text-[#87867f] text-sm mt-2'>
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
    <div className='mt-5 pt-5 border-t border-[#e8e6dc] dark:border-[#3d3d3a]'>
      <label className='block text-sm font-medium text-[#141413] dark:text-[#faf9f5]'>
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
        className='w-full h-2 bg-[#e8e6dc] dark:bg-[#3d3d3a] rounded-lg appearance-none cursor-pointer accent-[#c96442]'
      />
      <div className='min-w-fit text-[#87867f] text-sm mt-2'>
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
    <div className='mt-5 pt-5 border-t border-[#e8e6dc] dark:border-[#3d3d3a]'>
      <label className='block text-sm font-medium text-[#141413] dark:text-[#faf9f5] mb-2'>
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
                ? 'bg-[#c96442] border-[#c96442] text-white'
                : 'border-[#e8e6dc] dark:border-[#3d3d3a] text-[#5e5d59] dark:text-[#b0aea5] hover:bg-[#f0eee6] dark:hover:bg-[#30302e]'
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
