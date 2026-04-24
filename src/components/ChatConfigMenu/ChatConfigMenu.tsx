import React, { useState } from 'react';
import useStore from '@store/store';
import { useTranslation } from 'react-i18next';

import Select from 'react-select';
import PopupModal from '@components/PopupModal';
import PromptLibraryPicker from '@components/PromptLibraryMenu/PromptLibraryPicker';
import {
  FrequencyPenaltySlider,
  ImageDetailSelector,
  MaxTokenSlider,
  ModelSelector,
  PresencePenaltySlider,
  TemperatureSlider,
  TopPSlider,
} from '@components/ConfigMenu/ConfigMenu';

import {
  _defaultChatConfig,
  _defaultImageDetail,
  _defaultSystemMessage,
} from '@constants/chat';
import { ModelOptions } from '@utils/modelReader';
import { ImageDetail, ReasoningEffort } from '@type/chat';

const ChatConfigMenu = () => {
  const { t } = useTranslation('model');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  return (
    <div>
      <button
        className='btn btn-neutral'
        onClick={() => setIsModalOpen(true)}
        aria-label={t('defaultChatConfig') as string}
      >
        {t('defaultChatConfig')}
      </button>
      {isModalOpen && <ChatConfigPopup setIsModalOpen={setIsModalOpen} />}
    </div>
  );
};

const ChatConfigPopup = ({
  setIsModalOpen,
}: {
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const config = useStore.getState().defaultChatConfig;
  const setDefaultChatConfig = useStore((state) => state.setDefaultChatConfig);
  const setDefaultSystemMessage = useStore(
    (state) => state.setDefaultSystemMessage
  );
  const setDefaultImageDetail = useStore(
    (state) => state.setDefaultImageDetail
  );

  const [_systemMessage, _setSystemMessage] = useState<string>(
    useStore.getState().defaultSystemMessage
  );
  const [_model, _setModel] = useState<ModelOptions>(config.model);
  const [_maxToken, _setMaxToken] = useState<number>(config.max_tokens);
  const [_temperature, _setTemperature] = useState<number>(config.temperature);
  const [_topP, _setTopP] = useState<number>(config.top_p);
  const [_presencePenalty, _setPresencePenalty] = useState<number>(
    config.presence_penalty
  );
  const [_frequencyPenalty, _setFrequencyPenalty] = useState<number>(
    config.frequency_penalty
  );
  const [_imageDetail, _setImageDetail] = useState<ImageDetail>(
    useStore.getState().defaultImageDetail
  );
  const [_webSearch, _setWebSearch] = useState<boolean>(
    config.webSearch ?? false
  );
  const [_reasoningEffort, _setReasoningEffort] =
    useState<ReasoningEffort | null>(config.reasoningEffort ?? null);

  const { t } = useTranslation('model');

  const handleSave = () => {
    setDefaultChatConfig({
      model: _model,
      max_tokens: _maxToken,
      temperature: _temperature,
      top_p: _topP,
      presence_penalty: _presencePenalty,
      frequency_penalty: _frequencyPenalty,
      webSearch: _webSearch,
      reasoningEffort: _reasoningEffort,
    });
    setDefaultSystemMessage(_systemMessage);
    setDefaultImageDetail(_imageDetail);
    setIsModalOpen(false);
  };

  const handleReset = () => {
    _setModel(_defaultChatConfig.model);
    _setMaxToken(_defaultChatConfig.max_tokens);
    _setTemperature(_defaultChatConfig.temperature);
    _setTopP(_defaultChatConfig.top_p);
    _setPresencePenalty(_defaultChatConfig.presence_penalty);
    _setFrequencyPenalty(_defaultChatConfig.frequency_penalty);
    _setImageDetail(_defaultImageDetail);
    _setSystemMessage(_defaultSystemMessage);
    _setImageDetail(_defaultImageDetail);
    _setWebSearch(_defaultChatConfig.webSearch ?? false);
    _setReasoningEffort(_defaultChatConfig.reasoningEffort ?? null);
  };

  return (
    <PopupModal
      title={t('defaultChatConfig') as string}
      setIsModalOpen={setIsModalOpen}
      handleConfirm={handleSave}
    >
      <div className='p-6 border-b border-[#e8e6dc] dark:border-[#3d3d3a] w-full text-sm text-[#141413] dark:text-[#faf9f5]'>
        <DefaultSystemChat
          _systemMessage={_systemMessage}
          _setSystemMessage={_setSystemMessage}
        />
        <div className='mt-5 pt-5 border-t border-[#e8e6dc] dark:border-[#3d3d3a]'>
          <ModelSelector
            _model={_model}
            _setModel={_setModel}
            _label={t('model')}
          />
        </div>
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

        {/* Web Search default */}
        <div className='mt-5 pt-5 border-t border-[#e8e6dc] dark:border-[#3d3d3a]'>
          <div className='flex items-center justify-between'>
            <div>
              <label className='block text-sm font-medium text-[#141413] dark:text-[#faf9f5]'>
                {t('webSearch.label')}
              </label>
              <p className='mt-1 text-xs text-[#87867f]'>
                {t('webSearch.description')}
              </p>
            </div>
            <button
              type='button'
              role='switch'
              aria-checked={_webSearch}
              onClick={() => _setWebSearch((v) => !v)}
              className={`relative ml-4 shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#c96442] ${
                _webSearch ? 'bg-[#c96442]' : 'bg-[#e8e6dc] dark:bg-[#3d3d3a]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  _webSearch ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Reasoning Effort default */}
        <div className='mt-5 pt-5 border-t border-[#e8e6dc] dark:border-[#3d3d3a]'>
          <label className='block text-sm font-medium text-[#141413] dark:text-[#faf9f5]'>
            {t('reasoningEffort.label')}
          </label>
          <p className='mt-1 mb-2 text-xs text-[#87867f]'>
            {t('reasoningEffort.description')}
          </p>
          <div className='flex gap-2 flex-wrap'>
            {(
              [null, 'low', 'medium', 'high'] as Array<ReasoningEffort | null>
            ).map((opt) => (
              <button
                key={String(opt)}
                type='button'
                onClick={() => _setReasoningEffort(opt)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  _reasoningEffort === opt
                    ? 'bg-[#c96442] border-[#c96442] text-white'
                    : 'border-[#e8e6dc] dark:border-[#3d3d3a] text-[#5e5d59] dark:text-[#b0aea5] hover:bg-[#f0eee6] dark:hover:bg-[#30302e]'
                }`}
              >
                {opt === null
                  ? t('reasoningEffort.none')
                  : t(`reasoningEffort.${opt}`)}
              </button>
            ))}
          </div>
        </div>

        <button
          type='button'
          className='mt-6 text-xs px-3 py-1.5 rounded-lg bg-[#e8e6dc] dark:bg-[#3d3d3a] text-[#5e5d59] dark:text-[#b0aea5] hover:bg-[#dbd9cf] dark:hover:bg-[#4a4a46] transition-colors cursor-pointer'
          onClick={handleReset}
        >
          {t('resetToDefault')}
        </button>
      </div>
    </PopupModal>
  );
};

const DefaultSystemChat = ({
  _systemMessage,
  _setSystemMessage,
}: {
  _systemMessage: string;
  _setSystemMessage: React.Dispatch<React.SetStateAction<string>>;
}) => {
  const { t } = useTranslation('model');

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    target.style.height = 'auto';
    target.style.height = `${target.scrollHeight}px`;
    target.style.maxHeight = `${target.scrollHeight}px`;
  };

  const handleOnFocus = (e: React.FocusEvent<HTMLTextAreaElement, Element>) => {
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
    e.target.style.maxHeight = `${e.target.scrollHeight}px`;
  };

  const handleOnBlur = (e: React.FocusEvent<HTMLTextAreaElement, Element>) => {
    e.target.style.height = 'auto';
    e.target.style.maxHeight = '2.5rem';
  };

  return (
    <div>
      <div className='flex items-center justify-between mb-1'>
        <div className='block text-sm font-medium text-[#141413] dark:text-[#faf9f5]'>
          {t('defaultSystemMessage')}
        </div>
        <PromptLibraryPicker onSelect={_setSystemMessage} />
      </div>
      <textarea
        className='my-2 mx-0 px-3 resize-none rounded-lg bg-[#f5f3ec] dark:bg-[#242422] text-[#141413] dark:text-[#faf9f5] overflow-y-hidden leading-7 p-1.5 border border-[#e8e6dc] dark:border-[#3d3d3a] focus:outline-none focus:ring-2 focus:ring-[#c96442] w-full max-h-10 transition-all placeholder-[#87867f]'
        onFocus={handleOnFocus}
        onBlur={handleOnBlur}
        onChange={(e) => {
          _setSystemMessage(e.target.value);
        }}
        onInput={handleInput}
        value={_systemMessage}
        rows={1}
      ></textarea>
    </div>
  );
};

export default ChatConfigMenu;
