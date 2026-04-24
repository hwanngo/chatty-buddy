import React, { memo, useEffect, useState, useRef, ChangeEvent } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import useStore from '@store/store';

import useSubmit from '@hooks/useSubmit';

import {
  ChatInterface,
  ConfigInterface,
  ContentInterface,
  ImageContentInterface,
  TextContentInterface,
} from '@type/chat';

import PopupModal from '@components/PopupModal';
import ConfigMenu from '@components/ConfigMenu';
import { defaultModel, _defaultChatConfig } from '@constants/chat';
import { officialAPIEndpoint } from '@constants/auth';
import AttachmentIcon from '@icon/AttachmentIcon';
import GlobeIcon from '@icon/GlobeIcon';
import SparkleIcon from '@icon/SparkleIcon';
import SendIcon from '@icon/SendIcon';
import { ModelOptions } from '@utils/modelReader';
import { modelTypes, modelOptions } from '@constants/modelLoader';
import { ReasoningEffort, ImageDetail } from '@type/chat';

const EditView = ({
  content: content,
  setIsEdit,
  messageIndex,
  sticky,
  role,
}: {
  content: ContentInterface[];
  setIsEdit: React.Dispatch<React.SetStateAction<boolean>>;
  messageIndex: number;
  sticky?: boolean;
  role?: string;
}) => {
  const setCurrentChatIndex = useStore((state) => state.setCurrentChatIndex);
  const inputRole = useStore((state) => state.inputRole);
  const setChats = useStore((state) => state.setChats);
  const setToastMessage = useStore((state) => state.setToastMessage);
  const setToastStatus = useStore((state) => state.setToastStatus);
  const setToastShow = useStore((state) => state.setToastShow);
  var currentChatIndex = useStore((state) => state.currentChatIndex);
  const model = useStore((state) => {
    const isInitialised =
      state.chats &&
      state.chats.length > 0 &&
      state.currentChatIndex >= 0 &&
      state.currentChatIndex < state.chats.length;
    if (!isInitialised) {
      currentChatIndex = 0;
      setCurrentChatIndex(0);
    }
    return isInitialised
      ? state.chats![state.currentChatIndex].config.model
      : defaultModel;
  });

  const [_content, _setContent] = useState<ContentInterface[]>(content);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const textareaRef = React.createRef<HTMLTextAreaElement>();

  const { t } = useTranslation();

  const resetTextAreaHeight = () => {
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|playbook|silk/i.test(
        navigator.userAgent
      );

    if (e.key === 'Enter' && !isMobile && !e.nativeEvent.isComposing) {
      const enterToSubmit = useStore.getState().enterToSubmit;

      if (e.ctrlKey && e.shiftKey) {
        e.preventDefault();
        handleGenerate();
        resetTextAreaHeight();
      } else if (
        (enterToSubmit && !e.shiftKey) ||
        (!enterToSubmit && (e.ctrlKey || e.shiftKey))
      ) {
        if (sticky) {
          e.preventDefault();
          handleGenerate();
          resetTextAreaHeight();
        } else {
          handleSave();
        }
      }
    }
  };

  // convert message blob urls to base64
  const blobToBase64 = async (blob: Blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.readAsDataURL(blob);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const updatedChats: ChatInterface[] = JSON.parse(
      JSON.stringify(useStore.getState().chats)
    );
    const chat = updatedChats[currentChatIndex];
    const allFiles = Array.from(e.target.files!);
    const imageFiles = allFiles.filter((f) => f.type.startsWith('image/'));
    const skipped = allFiles.length - imageFiles.length;
    if (skipped > 0) {
      setToastMessage(t('onlyImagesSupported'));
      setToastStatus('warning');
      setToastShow(true);
    }
    if (imageFiles.length === 0) return;
    const newImageURLs = imageFiles.map((file) => URL.createObjectURL(file));
    const newImages = await Promise.all(
      newImageURLs.map(async (url) => {
        const blob = await fetch(url).then((r) => r.blob());
        return {
          type: 'image_url',
          image_url: {
            detail: chat.imageDetail,
            url: (await blobToBase64(blob)) as string,
          },
        } as ImageContentInterface;
      })
    );
    _setContent([..._content, ...newImages]);
  };

  const handleImageUrlChange = () => {
    if (imageUrl.trim() === '') return;
    const updatedChats: ChatInterface[] = JSON.parse(
      JSON.stringify(useStore.getState().chats)
    );
    const chat = updatedChats[currentChatIndex];
    const newImage: ImageContentInterface = {
      type: 'image_url',
      image_url: {
        detail: chat.imageDetail,
        url: imageUrl,
      },
    };

    const updatedContent = [..._content, newImage];
    _setContent(updatedContent);
    setImageUrl('');
  };

  const handleImageDetailChange = (index: number, detail: string) => {
    const updatedImages = [..._content];
    updatedImages[index + 1].image_url.detail = detail;
    _setContent(updatedImages);
  };

  const handleRemoveImage = (index: number) => {
    const updatedImages = [..._content];
    updatedImages.splice(index + 1, 1);

    _setContent(updatedImages);
  };
  const handleSave = () => {
    const hasTextContent = (_content[0] as TextContentInterface).text !== '';
    const hasImageContent =
      Array.isArray(_content) &&
      _content.some((content) => content.type === 'image_url');

    if (
      sticky &&
      ((!hasTextContent && !hasImageContent) || useStore.getState().generating)
    ) {
      return;
    }
    const originalChats: ChatInterface[] = JSON.parse(
      JSON.stringify(useStore.getState().chats)
    );
    const updatedChats: ChatInterface[] = JSON.parse(
      JSON.stringify(useStore.getState().chats)
    );
    const updatedMessages = updatedChats[currentChatIndex].messages;

    if (sticky) {
      updatedMessages.push({ role: inputRole, content: _content });
      _setContent([
        {
          type: 'text',
          text: '',
        } as TextContentInterface,
      ]);
      resetTextAreaHeight();
    } else {
      updatedMessages[messageIndex].content = _content;
      setIsEdit(false);
    }
    try {
      setChats(updatedChats);
    } catch (error: unknown) {
      if ((error as DOMException).name === 'QuotaExceededError') {
        setChats(originalChats);
        setToastMessage(t('notifications.quotaExceeded', { ns: 'import' }));
        setToastStatus('error');
        setToastShow(true);
        // try to save text only
        const textOnlyContent = _content.filter(isTextContent);
        if (textOnlyContent.length > 0) {
          updatedMessages[messageIndex].content = textOnlyContent;
          try {
            setChats(updatedChats);
            setToastMessage(t('notifications.textSavedOnly', { ns: 'import' }));
            setToastStatus('success');
            setToastShow(true);
          } catch (innerError: unknown) {
            setToastMessage((innerError as Error).message);
            setToastStatus('error');
            setToastShow(true);
          }
        }
      } else {
        setToastMessage((error as Error).message);
        setToastStatus('error');
        setToastShow(true);
      }
    }
  };

  const { handleSubmit } = useSubmit();
  const handleGenerate = () => {
    const hasTextContent = (_content[0] as TextContentInterface).text !== '';
    const hasImageContent =
      Array.isArray(_content) &&
      _content.some((content) => content.type === 'image_url');

    if (useStore.getState().generating) {
      return;
    }

    // validate API key before saving the user message to chat history
    const { apiKey: _apiKey, apiEndpoint: _apiEndpoint } = useStore.getState();
    if (
      (!_apiKey || _apiKey.length === 0) &&
      _apiEndpoint === officialAPIEndpoint
    ) {
      setToastMessage(t('noApiKeyWarning', { ns: 'api' }) as string);
      setToastStatus('error');
      setToastShow(true);
      return;
    }

    const originalChats: ChatInterface[] = JSON.parse(
      JSON.stringify(useStore.getState().chats)
    );
    const updatedChats: ChatInterface[] = JSON.parse(
      JSON.stringify(useStore.getState().chats)
    );
    const updatedMessages = updatedChats[currentChatIndex].messages;

    if (sticky) {
      if (hasTextContent || hasImageContent) {
        updatedMessages.push({ role: inputRole, content: _content });
      }
      _setContent([
        {
          type: 'text',
          text: '',
        } as TextContentInterface,
      ]);
      resetTextAreaHeight();
    } else {
      updatedMessages[messageIndex].content = _content;
      updatedChats[currentChatIndex].messages = updatedMessages.slice(
        0,
        messageIndex + 1
      );
      setIsEdit(false);
    }
    try {
      setChats(updatedChats);
    } catch (error: unknown) {
      if ((error as DOMException).name === 'QuotaExceededError') {
        setChats(originalChats);
        setToastMessage(t('notifications.quotaExceeded', { ns: 'import' }));
        setToastStatus('error');
        setToastShow(true);
        // try to save text only
        const textOnlyContent = _content.filter(isTextContent);
        if (textOnlyContent.length > 0) {
          updatedMessages[messageIndex].content = textOnlyContent;
          try {
            setChats(updatedChats);
            setToastMessage(t('notifications.textSavedOnly', { ns: 'import' }));
            setToastStatus('success');
            setToastShow(true);
          } catch (innerError: unknown) {
            setToastMessage((innerError as Error).message);
            setToastStatus('error');
            setToastShow(true);
          }
        }
      } else {
        setToastMessage((error as Error).message);
        setToastStatus('error');
        setToastShow(true);
      }
    }
    handleSubmit();
  };

  const isTextContent = (
    content: ContentInterface
  ): content is TextContentInterface => {
    return content.type === 'text';
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    const updatedChats: ChatInterface[] = JSON.parse(
      JSON.stringify(useStore.getState().chats)
    );
    const chat = updatedChats[currentChatIndex];
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        if (blob) {
          const base64Image = (await blobToBase64(blob)) as string;
          const newImage: ImageContentInterface = {
            type: 'image_url',
            image_url: {
              detail: chat.imageDetail,
              url: base64Image,
            },
          };
          const updatedContent = [..._content, newImage];
          _setContent(updatedContent);
        }
      }
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [(_content[0] as TextContentInterface).text]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, []);

  const fileInputRef = useRef(null);
  const handleUploadButtonClick = () => {
    // Trigger the file input when the custom button is clicked
    (fileInputRef.current! as HTMLInputElement).click();
  };
  return (
    <div className='relative'>
      {modelTypes[model] == 'image' && _content.slice(1).length > 0 && (
        <div className='flex gap-2 mb-2 flex-wrap'>
          {_content.slice(1).map((image, index) => (
            <div key={index} className='relative'>
              <img
                src={(image as ImageContentInterface).image_url.url}
                alt={`uploaded-${index}`}
                className='w-16 h-16 object-cover rounded-xl'
              />
              <button
                type='button'
                className='absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-[#141413] dark:bg-[#faf9f5] text-[#faf9f5] dark:text-[#141413] cursor-pointer transition-colors hover:bg-[#3d3d3a] dark:hover:bg-[#e8e6dc]'
                onClick={() => handleRemoveImage(index)}
                aria-label={t('removeImage') as string}
              >
                <svg width={8} height={8} viewBox='0 0 12 12' fill='none'>
                  <path
                    d='M1 1l10 10M11 1L1 11'
                    stroke='currentColor'
                    strokeWidth='2.5'
                    strokeLinecap='round'
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
      <div
        className={`w-full ${
          sticky ? 'py-1 px-0 text-[#141413] dark:text-[#faf9f5]' : ''
        }`}
      >
        <div className='relative flex items-center gap-1'>
          {modelTypes[model] == 'image' && (
            <button
              className='shrink-0 flex items-center justify-center w-7 h-7 text-[#5e5d59] dark:text-[#b0aea5] hover:text-[#141413] dark:hover:text-[#faf9f5] transition-colors cursor-pointer'
              onClick={handleUploadButtonClick}
              aria-label={t('uploadImages') as string}
            >
              <AttachmentIcon />
            </button>
          )}
          <textarea
            ref={textareaRef}
            className='m-0 resize-none rounded-lg bg-transparent overflow-y-hidden focus:ring-0 focus-visible:ring-0 leading-7 w-full placeholder:text-[#87867f]/60 pr-10'
            onChange={(e) => {
              _setContent((prev) => [
                { type: 'text', text: e.target.value },
                ...prev.slice(1),
              ]);
            }}
            value={(_content[0] as TextContentInterface).text}
            placeholder={
              role === 'system'
                ? (t('systemPlaceholder') as string)
                : role === 'assistant'
                  ? (t('assistantPlaceholder') as string)
                  : (t('submitPlaceholder') as string)
            }
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            rows={1}
          ></textarea>
        </div>
      </div>
      {sticky && (
        <InputToolbar
          currentChatIndex={currentChatIndex}
          setChats={setChats}
          hasImages={
            Array.isArray(_content) &&
            _content.some((c) => c.type === 'image_url')
          }
        />
      )}
      <EditViewButtons
        sticky={sticky}
        role={role}
        handleFileChange={handleFileChange}
        handleImageDetailChange={handleImageDetailChange}
        handleRemoveImage={handleRemoveImage}
        handleGenerate={handleGenerate}
        handleSave={handleSave}
        setIsModalOpen={setIsModalOpen}
        setIsEdit={setIsEdit}
        _setContent={_setContent}
        _content={_content}
        imageUrl={imageUrl}
        setImageUrl={setImageUrl}
        handleImageUrlChange={handleImageUrlChange}
        fileInputRef={fileInputRef}
        model={model}
      />
      {isModalOpen && (
        <PopupModal
          setIsModalOpen={setIsModalOpen}
          title={t('warning') as string}
          message={t('clearMessageWarning') as string}
          handleConfirm={handleGenerate}
        />
      )}
    </div>
  );
};

const EditViewButtons = memo(
  ({
    sticky = false,
    role,
    handleFileChange,
    handleImageDetailChange,
    handleRemoveImage,
    handleGenerate,
    handleSave,
    setIsModalOpen,
    setIsEdit,
    _setContent,
    _content,
    imageUrl,
    setImageUrl,
    handleImageUrlChange,
    fileInputRef,
    model,
  }: {
    sticky?: boolean;
    role?: string;
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleImageDetailChange: (index: number, e: string) => void;
    handleRemoveImage: (index: number) => void;
    handleGenerate: () => void;
    handleSave: () => void;
    setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setIsEdit: React.Dispatch<React.SetStateAction<boolean>>;
    _setContent: React.Dispatch<React.SetStateAction<ContentInterface[]>>;
    _content: ContentInterface[];
    imageUrl: string;
    setImageUrl: React.Dispatch<React.SetStateAction<string>>;
    handleImageUrlChange: () => void;
    fileInputRef: React.MutableRefObject<null>;
    model: ModelOptions;
  }) => {
    const { t } = useTranslation();
    const [showImageUrl, setShowImageUrl] = useState<boolean>(false);
    const generating = useStore.getState().generating;

    return (
      <div>
        {modelTypes[model] == 'image' && role !== 'system' && (
          <>
            {/* URL input — toggled by bottom bar, hidden in non-sticky edit mode */}
            {showImageUrl && (
              <div className='flex gap-2 mt-4'>
                <input
                  type='text'
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder={t('enterImageUrlPlaceholder') as string}
                  className='flex-1 text-[#141413] dark:text-[#faf9f5] px-3 py-2 text-sm bg-[#f0eee6] dark:bg-[#30302e] border border-[#e8e6dc] dark:border-[#3d3d3a] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3898ec] placeholder:text-[#87867f]'
                />
                <button
                  className='flex items-center px-3 py-2 rounded-lg border border-[#e8e6dc] dark:border-[#3d3d3a] bg-transparent text-[#5e5d59] dark:text-[#b0aea5] text-[13px] font-medium hover:bg-[#f0eee6] dark:hover:bg-[#30302e] hover:text-[#141413] dark:hover:text-[#faf9f5] transition-colors duration-150 cursor-pointer whitespace-nowrap'
                  onClick={handleImageUrlChange}
                  aria-label={t('addImageUrl') as string}
                >
                  {t('addImageUrl')}
                </button>
              </div>
            )}

            {/* Hidden file input */}
            <input
              type='file'
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileChange}
              multiple
            />
          </>
        )}

        {/* Hidden trigger buttons for sticky mode — fired by ChatContent bottom bar */}
        {sticky && (
          <>
            <button
              id='sticky-generate-btn'
              className='hidden'
              onClick={handleGenerate}
              aria-hidden='true'
            />
            <button
              id='sticky-save-btn'
              className='hidden'
              onClick={handleSave}
              aria-hidden='true'
            />
            {modelTypes[model] == 'image' && (
              <button
                id='sticky-toggle-imgurl-btn'
                className='hidden'
                onClick={() => setShowImageUrl((v) => !v)}
                aria-hidden='true'
              />
            )}
          </>
        )}

        {!sticky && (
          <div className='flex items-center gap-2 mt-3 pt-2 border-t border-[#e8e6dc] dark:border-[#3d3d3a]'>
            <div className='flex-1' />
            <button
              className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e8e6dc] dark:border-[#3d3d3a] bg-transparent text-[#5e5d59] dark:text-[#b0aea5] text-[13px] font-medium hover:bg-[#f0eee6] dark:hover:bg-[#30302e] hover:text-[#141413] dark:hover:text-[#faf9f5] transition-colors duration-150 cursor-pointer'
              onClick={() => setIsEdit(false)}
              aria-label={t('cancel') as string}
            >
              {t('cancel')}
            </button>
            <button
              className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e8e6dc] dark:border-[#3d3d3a] bg-transparent text-[#5e5d59] dark:text-[#b0aea5] text-[13px] font-medium hover:bg-[#f0eee6] dark:hover:bg-[#30302e] hover:text-[#141413] dark:hover:text-[#faf9f5] transition-colors duration-150 cursor-pointer'
              onClick={handleSave}
              aria-label={t('save') as string}
            >
              {t('save')}
            </button>
            <button
              className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#c96442] text-[#faf9f5] text-[13px] font-medium hover:bg-[#b85538] transition-colors duration-150 cursor-pointer border-0'
              onClick={() => {
                !generating && setIsModalOpen(true);
              }}
              aria-label={t('generate') as string}
            >
              <SendIcon />
              {t('generate')}
            </button>
          </div>
        )}
      </div>
    );
  }
);

const GearIcon = () => (
  <svg
    width={13}
    height={13}
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='1.75'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <circle cx='12' cy='12' r='3' />
    <path d='M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z' />
  </svg>
);

const ChevronDown = () => (
  <svg
    width={10}
    height={10}
    viewBox='0 0 16 16'
    fill='none'
    style={{ flexShrink: 0 }}
  >
    <path
      d='M4 6l4 4 4-4'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);

const InputToolbar = ({
  currentChatIndex,
  setChats,
  hasImages,
}: {
  currentChatIndex: number;
  setChats: (chats: ChatInterface[]) => void;
  hasImages: boolean;
}) => {
  const { t } = useTranslation('model');
  const { t: tMain } = useTranslation();
  const generating = useStore((state) => state.generating);
  const customModels = useStore((state) => state.customModels);
  const chat = useStore((state) =>
    state.chats &&
    state.chats.length > 0 &&
    state.currentChatIndex >= 0 &&
    state.currentChatIndex < state.chats.length
      ? state.chats[state.currentChatIndex]
      : undefined
  );
  const webSearch = chat?.config.webSearch ?? false;
  const reasoningEffort = chat?.config.reasoningEffort ?? null;
  const imageDetail = chat?.imageDetail ?? 'auto';

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ bottom: 0, right: 0 });
  const chipRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const setConfig = (config: ConfigInterface) => {
    const updatedChats: ChatInterface[] = JSON.parse(
      JSON.stringify(useStore.getState().chats)
    );
    updatedChats[currentChatIndex].config = config;
    setChats(updatedChats);
  };

  const setImageDetailFn = (detail: ImageDetail) => {
    const updatedChats: ChatInterface[] = JSON.parse(
      JSON.stringify(useStore.getState().chats)
    );
    updatedChats[currentChatIndex].imageDetail = detail;
    setChats(updatedChats);
  };

  const allModelOptions = [
    ...customModels.map((m) => ({
      value: m.id,
      label: `${m.name} ${t('customModels.customLabel')}`,
    })),
    ...modelOptions
      .filter((id) => !customModels.some((m) => m.id === id))
      .map((id) => ({ value: id, label: id })),
  ];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideChip = chipRef.current?.contains(target);
      const insideDropdown = dropdownRef.current?.contains(target);
      if (!insideChip && !insideDropdown) {
        setIsDropdownOpen(false);
        setModelSearch('');
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => searchRef.current?.focus(), 0);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  const hasNonDefaults = chat
    ? chat.config.max_tokens !== _defaultChatConfig.max_tokens ||
      chat.config.temperature !== _defaultChatConfig.temperature ||
      chat.config.top_p !== _defaultChatConfig.top_p ||
      chat.config.presence_penalty !== _defaultChatConfig.presence_penalty ||
      chat.config.frequency_penalty !== _defaultChatConfig.frequency_penalty ||
      (chat.imageDetail ?? 'auto') !== 'auto'
    : false;

  const handleToggleWebSearch = () => {
    if (!useStore.getState().chats) return;
    const updatedChats: ChatInterface[] = JSON.parse(
      JSON.stringify(useStore.getState().chats)
    );
    updatedChats[currentChatIndex].config.webSearch =
      !updatedChats[currentChatIndex].config.webSearch;
    setChats(updatedChats);
  };

  const handleCycleReasoningEffort = () => {
    if (!useStore.getState().chats) return;
    const order: Array<ReasoningEffort | null> = [
      null,
      'low',
      'medium',
      'high',
    ];
    const current =
      useStore.getState().chats![currentChatIndex].config.reasoningEffort ??
      null;
    const next = order[(order.indexOf(current) + 1) % order.length];
    const updatedChats: ChatInterface[] = JSON.parse(
      JSON.stringify(useStore.getState().chats)
    );
    updatedChats[currentChatIndex].config.reasoningEffort = next;
    setChats(updatedChats);
  };

  const handleCycleImageDetail = () => {
    if (!useStore.getState().chats) return;
    const order: Array<'auto' | 'low' | 'high'> = ['auto', 'low', 'high'];
    const current = (useStore.getState().chats![currentChatIndex].imageDetail ??
      'auto') as 'auto' | 'low' | 'high';
    const next = order[(order.indexOf(current) + 1) % order.length];
    const updatedChats: ChatInterface[] = JSON.parse(
      JSON.stringify(useStore.getState().chats)
    );
    updatedChats[currentChatIndex].imageDetail = next;
    setChats(updatedChats);
  };

  const activeClass =
    'border-[#c96442] bg-[#c96442] text-white hover:bg-[#b85538]';
  const inactiveClass =
    'border-[#e8e6dc] dark:border-[#3d3d3a] bg-transparent text-[#5e5d59] dark:text-[#b0aea5] hover:bg-[#f0eee6] dark:hover:bg-[#30302e] hover:text-[#141413] dark:hover:text-[#faf9f5]';

  return (
    <>
      <div className='flex items-center gap-2 pt-2'>
        <button
          type='button'
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[12px] font-medium transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c96442] ${
            webSearch ? activeClass : inactiveClass
          }`}
          onClick={handleToggleWebSearch}
          aria-label={t('webSearch.label') as string}
          aria-pressed={webSearch}
        >
          <GlobeIcon className='w-3.5 h-3.5' />
          {t('webSearch.label')}
        </button>
        <button
          type='button'
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[12px] font-medium transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c96442] ${
            reasoningEffort ? activeClass : inactiveClass
          }`}
          onClick={handleCycleReasoningEffort}
          aria-label={t('reasoningEffort.label') as string}
          aria-pressed={reasoningEffort !== null}
        >
          <SparkleIcon className='w-3.5 h-3.5' />
          <span className={reasoningEffort ? 'opacity-80 font-normal' : ''}>
            {t('reasoningEffort.label')}:
          </span>
          <span>
            {reasoningEffort
              ? t(`reasoningEffort.${reasoningEffort}`)
              : t('reasoningEffort.none')}
          </span>
        </button>
        {hasImages && (
          <button
            type='button'
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[12px] font-medium transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c96442] ${
              imageDetail !== 'auto' ? activeClass : inactiveClass
            }`}
            onClick={handleCycleImageDetail}
            aria-label={t('imageDetail.label') as string}
          >
            <svg
              width='14'
              height='14'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.75'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <rect x='3' y='3' width='18' height='18' rx='2' ry='2' />
              <circle cx='8.5' cy='8.5' r='1.5' />
              <polyline points='21 15 16 10 5 21' />
            </svg>
            <span
              className={imageDetail !== 'auto' ? 'opacity-80 font-normal' : ''}
            >
              {t('imageDetail.label')}:
            </span>
            <span>{t(`imageDetail.${imageDetail}`)}</span>
          </button>
        )}

        <div className='flex-1' />

        {/* Model chip dropdown — rendered via portal to escape overflow:hidden parents */}
        {chat && (
          <>
            <button
              ref={chipRef}
              type='button'
              onClick={() => {
                if (!isDropdownOpen && chipRef.current) {
                  const rect = chipRef.current.getBoundingClientRect();
                  setDropdownPos({
                    bottom: window.innerHeight - rect.top + 6,
                    right: window.innerWidth - rect.right,
                  });
                }
                setIsDropdownOpen((v) => !v);
              }}
              className='flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#c96442] bg-[rgba(201,100,66,0.10)] text-[#c96442] text-[12px] font-medium whitespace-nowrap hover:bg-[rgba(201,100,66,0.16)] transition-colors cursor-pointer'
            >
              {customModels.find((m) => m.id === chat.config.model)
                ? `${customModels.find((m) => m.id === chat.config.model)?.name} ${t('customModels.customLabel')}`
                : chat.config.model}
              <ChevronDown />
            </button>

            {isDropdownOpen &&
              ReactDOM.createPortal(
                <div
                  ref={dropdownRef}
                  style={{
                    bottom: dropdownPos.bottom,
                    right: dropdownPos.right,
                  }}
                  className='fixed z-[9999] min-w-[240px] max-w-[320px] rounded-[10px] border border-[#e8e6dc] dark:border-[#3d3d3a] bg-[#faf9f5] dark:bg-[#282826] shadow-lg flex flex-col-reverse'
                >
                  <div className='px-2 pb-2 pt-1 border-t border-[#e8e6dc] dark:border-[#3d3d3a]'>
                    <input
                      ref={searchRef}
                      type='text'
                      value={modelSearch}
                      onChange={(e) => setModelSearch(e.target.value)}
                      placeholder={t('searchModels')}
                      className='w-full px-2.5 py-1.5 text-[12px] rounded-[6px] border border-[#e8e6dc] dark:border-[#3d3d3a] bg-white dark:bg-[#1c1c1a] text-[#141413] dark:text-[#faf9f5] placeholder-[#87867f] focus:outline-none focus:border-[#c96442]'
                    />
                  </div>
                  <div className='max-h-[280px] overflow-y-auto py-1'>
                    {allModelOptions
                      .filter((opt) =>
                        opt.label
                          .toLowerCase()
                          .includes(modelSearch.toLowerCase())
                      )
                      .map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setConfig({ ...chat.config, model: opt.value });
                            setIsDropdownOpen(false);
                            setModelSearch('');
                          }}
                          className={`w-full text-left px-3 py-2 text-[13px] truncate transition-colors ${
                            chat.config.model === opt.value
                              ? 'bg-[#c96442] text-white font-medium'
                              : 'text-[#141413] dark:text-[#faf9f5] hover:bg-[#f0eee6] dark:hover:bg-[#3a3a37]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                  </div>
                </div>,
                document.body
              )}
          </>
        )}

        {/* Config gear */}
        {chat && (
          <div className='relative shrink-0'>
            <button
              type='button'
              onClick={() => setIsConfigOpen(true)}
              className='flex items-center px-2 py-1.5 rounded-lg border border-[#e8e6dc] dark:border-[#3d3d3a] bg-[#f0eee6] dark:bg-[#30302e] text-[#5e5d59] dark:text-[#b0aea5] hover:bg-[#e8e6dc] dark:hover:bg-[#3a3a37] hover:text-[#141413] dark:hover:text-[#faf9f5] transition-colors cursor-pointer'
              aria-label='Chat configuration'
            >
              <GearIcon />
            </button>
            {hasNonDefaults && (
              <span className='absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#c96442] pointer-events-none' />
            )}
          </div>
        )}

        {!generating && (
          <>
            <button
              className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e8e6dc] dark:border-[#3d3d3a] bg-transparent text-[#5e5d59] dark:text-[#b0aea5] text-[13px] font-medium hover:bg-[#f0eee6] dark:hover:bg-[#30302e] hover:text-[#141413] dark:hover:text-[#faf9f5] transition-colors duration-150 cursor-pointer'
              onClick={() =>
                (
                  document.getElementById(
                    'sticky-save-btn'
                  ) as HTMLButtonElement
                )?.click()
              }
              aria-label={tMain('save') as string}
            >
              {tMain('save')}
            </button>
            <button
              className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#c96442] text-[#faf9f5] text-[13px] font-medium hover:bg-[#b85538] transition-colors duration-150 cursor-pointer border-0'
              onClick={() =>
                (
                  document.getElementById(
                    'sticky-generate-btn'
                  ) as HTMLButtonElement
                )?.click()
              }
              aria-label={tMain('generate') as string}
            >
              <SendIcon />
              {tMain('generate')}
            </button>
          </>
        )}
      </div>

      {isConfigOpen && chat && (
        <ConfigMenu
          setIsModalOpen={setIsConfigOpen}
          config={chat.config}
          setConfig={setConfig}
          imageDetail={chat.imageDetail}
          setImageDetail={setImageDetailFn}
        />
      )}
    </>
  );
};

export default EditView;
