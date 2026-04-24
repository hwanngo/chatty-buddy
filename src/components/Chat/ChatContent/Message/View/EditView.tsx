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

import Dialog from '@components/Dialog';
import ConfigMenu from '@components/ConfigMenu';
import { defaultModel, _defaultChatConfig } from '@constants/chat';
import { officialAPIEndpoint } from '@constants/auth';
import Icon from '@components/Icon';
import { ModelOptions } from '@utils/modelReader';
import { sanitizeImageUrl } from '@utils/url';
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
  const addToast = useStore((state) => state.addToast);
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
      addToast('warning', t('onlyImagesSupported'));
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
    // Only accept http(s) or data:image URLs; reject javascript:/file:/etc.
    const safeUrl = sanitizeImageUrl(imageUrl);
    if (!safeUrl) {
      addToast('warning', t('onlyImagesSupported'));
      return;
    }
    const updatedChats: ChatInterface[] = JSON.parse(
      JSON.stringify(useStore.getState().chats)
    );
    const chat = updatedChats[currentChatIndex];
    const newImage: ImageContentInterface = {
      type: 'image_url',
      image_url: {
        detail: chat.imageDetail,
        url: safeUrl,
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
        addToast('error', t('notifications.quotaExceeded', { ns: 'import' }));
        // try to save text only
        const textOnlyContent = _content.filter(isTextContent);
        if (textOnlyContent.length > 0) {
          updatedMessages[messageIndex].content = textOnlyContent;
          try {
            setChats(updatedChats);
            addToast('success', t('notifications.textSavedOnly', { ns: 'import' }));
          } catch (innerError: unknown) {
            addToast('error', (innerError as Error).message);
          }
        }
      } else {
        addToast('error', (error as Error).message);
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
      addToast('error', t('noApiKeyWarning', { ns: 'api' }) as string);
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
        addToast('error', t('notifications.quotaExceeded', { ns: 'import' }));
        // try to save text only
        const textOnlyContent = _content.filter(isTextContent);
        if (textOnlyContent.length > 0) {
          updatedMessages[messageIndex].content = textOnlyContent;
          try {
            setChats(updatedChats);
            addToast('success', t('notifications.textSavedOnly', { ns: 'import' }));
          } catch (innerError: unknown) {
            addToast('error', (innerError as Error).message);
          }
        }
      } else {
        addToast('error', (error as Error).message);
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
                src={sanitizeImageUrl(
                  (image as ImageContentInterface).image_url.url
                )}
                alt={`uploaded-${index}`}
                className='w-16 h-16 object-cover rounded-xl'
              />
              <button
                type='button'
                className='absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-[var(--fg)] text-[var(--bg-card)] cursor-pointer transition-colors hover:bg-[var(--fg-btn)]'
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
          sticky ? 'py-1 px-0 text-[var(--fg)]' : ''
        }`}
      >
        <div className='relative flex items-center gap-1'>
          {modelTypes[model] == 'image' && (
            <button
              className='tap-target shrink-0 flex items-center justify-center w-7 h-7 text-[var(--fg-2)] hover:text-[var(--fg)] transition-colors cursor-pointer'
              onClick={handleUploadButtonClick}
              aria-label={t('uploadImages') as string}
            >
              <Icon name="attachment" />
            </button>
          )}
          <textarea
            ref={textareaRef}
            className='m-0 resize-none rounded-lg bg-transparent max-h-[200px] overflow-y-auto focus:ring-0 focus-visible:ring-0 leading-7 w-full placeholder:text-[var(--fg-3)]/60 pr-10'
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
        <Dialog
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
                  className='flex-1 text-[var(--fg)] px-3 py-2 text-sm bg-[var(--bg-hover)] border border-[var(--border-mid)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--focus)] placeholder:text-[var(--fg-3)]'
                />
                <button
                  className='flex items-center px-3 py-2 rounded-lg border border-[var(--border-mid)] bg-transparent text-[var(--fg-2)] text-[13px] font-medium hover:bg-[var(--bg-hover)] hover:text-[var(--fg)] transition-colors duration-150 cursor-pointer whitespace-nowrap'
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
          <div className='flex items-center gap-2 mt-3 pt-2 border-t border-[var(--border-mid)]'>
            <div className='flex-1' />
            <button
              className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-mid)] bg-transparent text-[var(--fg-2)] text-[13px] font-medium hover:bg-[var(--bg-hover)] hover:text-[var(--fg)] transition-colors duration-150 cursor-pointer'
              onClick={() => setIsEdit(false)}
              aria-label={t('cancel') as string}
            >
              {t('cancel')}
            </button>
            <button
              className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-mid)] bg-transparent text-[var(--fg-2)] text-[13px] font-medium hover:bg-[var(--bg-hover)] hover:text-[var(--fg)] transition-colors duration-150 cursor-pointer'
              onClick={handleSave}
              aria-label={t('save') as string}
            >
              {t('save')}
            </button>
            <button
              className='flex items-center gap-1.5 px-3 py-1.5 max-md:min-h-[44px] rounded-lg bg-[var(--accent)] text-[var(--accent-fg)] text-[13px] font-medium hover:bg-[var(--accent-hover)] transition-colors duration-150 cursor-pointer border-0'
              onClick={() => {
                !generating && setIsModalOpen(true);
              }}
              aria-label={t('generate') as string}
            >
              <Icon name="send" />
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

const SlidersIcon = () => (
  <svg
    width={14}
    height={14}
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='1.75'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <line x1='4' y1='21' x2='4' y2='14' />
    <line x1='4' y1='10' x2='4' y2='3' />
    <line x1='12' y1='21' x2='12' y2='12' />
    <line x1='12' y1='8' x2='12' y2='3' />
    <line x1='20' y1='21' x2='20' y2='16' />
    <line x1='20' y1='12' x2='20' y2='3' />
    <line x1='1' y1='14' x2='7' y2='14' />
    <line x1='9' y1='8' x2='15' y2='8' />
    <line x1='17' y1='16' x2='23' y2='16' />
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

  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [toolsPos, setToolsPos] = useState({ bottom: 0, left: 0 });
  const toolsRef = useRef<HTMLButtonElement>(null);
  const toolsDropdownRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !toolsRef.current?.contains(target) &&
        !toolsDropdownRef.current?.contains(target)
      ) {
        setIsToolsOpen(false);
      }
    };
    if (isToolsOpen)
      document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isToolsOpen]);

  const activeToolCount =
    (webSearch ? 1 : 0) +
    (reasoningEffort ? 1 : 0) +
    (hasImages && imageDetail !== 'auto' ? 1 : 0);

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
    'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)]';
  const inactiveClass =
    'border-[var(--border-mid)] bg-transparent text-[var(--fg-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg)]';

  return (
    <>
      <div className='flex flex-wrap items-center gap-2 pt-2'>
        {/* Tools menu — collapses the secondary controls so the row stays compact */}
        {chat && (
          <button
            ref={toolsRef}
            type='button'
            onClick={() => {
              if (!isToolsOpen && toolsRef.current) {
                const rect = toolsRef.current.getBoundingClientRect();
                setToolsPos({
                  bottom: window.innerHeight - rect.top + 6,
                  left: rect.left,
                });
              }
              setIsToolsOpen((v) => !v);
            }}
            aria-haspopup='true'
            aria-expanded={isToolsOpen}
            className={`flex items-center gap-1.5 px-2.5 py-1 max-md:min-h-[44px] rounded-lg border text-[12px] font-medium transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
              activeToolCount > 0 ? activeClass : inactiveClass
            }`}
          >
            <SlidersIcon />
            {t('tools')}
            {activeToolCount > 0 && (
              <span className='opacity-80'>· {activeToolCount}</span>
            )}
          </button>
        )}

        {isToolsOpen &&
          chat &&
          ReactDOM.createPortal(
            <div
              ref={toolsDropdownRef}
              style={{ bottom: toolsPos.bottom, left: toolsPos.left }}
              className='fixed z-[9999] min-w-[240px] rounded-[10px] border border-[var(--border-mid)] bg-[var(--bg-card)] shadow-[var(--shadow-float)] py-1'
            >
              {/* Web Search — boolean toggle */}
              <button
                type='button'
                onClick={handleToggleWebSearch}
                className='w-full flex items-center justify-between gap-3 px-3 py-2.5 text-[13px] text-[var(--fg)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer'
              >
                <span className='flex items-center gap-2'>
                  <Icon name='globe' className='w-4 h-4' />
                  {t('webSearch.label')}
                </span>
                <span
                  className={`relative inline-flex h-[18px] w-[32px] shrink-0 rounded-full transition-colors ${
                    webSearch
                      ? 'bg-[var(--accent)]'
                      : 'bg-[var(--border-mid)]'
                  }`}
                >
                  <span
                    className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white transition-transform ${
                      webSearch ? 'translate-x-[16px]' : 'translate-x-[2px]'
                    }`}
                  />
                </span>
              </button>

              {/* Reasoning — cycles None → Low → Medium → High */}
              <button
                type='button'
                onClick={handleCycleReasoningEffort}
                className='w-full flex items-center justify-between gap-3 px-3 py-2.5 text-[13px] text-[var(--fg)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer'
              >
                <span className='flex items-center gap-2'>
                  <Icon name='sparkle' className='w-4 h-4' />
                  {t('reasoningEffort.label')}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                    reasoningEffort
                      ? 'border-[var(--accent)] text-[var(--accent)]'
                      : 'border-[var(--border-mid)] text-[var(--fg-3)]'
                  }`}
                >
                  {reasoningEffort
                    ? t(`reasoningEffort.${reasoningEffort}`)
                    : t('reasoningEffort.none')}
                </span>
              </button>

              {/* Image detail — only when the message has images */}
              {hasImages && (
                <button
                  type='button'
                  onClick={handleCycleImageDetail}
                  className='w-full flex items-center justify-between gap-3 px-3 py-2.5 text-[13px] text-[var(--fg)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer'
                >
                  <span className='flex items-center gap-2'>
                    <svg
                      width='16'
                      height='16'
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
                    {t('imageDetail.label')}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                      imageDetail !== 'auto'
                        ? 'border-[var(--accent)] text-[var(--accent)]'
                        : 'border-[var(--border-mid)] text-[var(--fg-3)]'
                    }`}
                  >
                    {t(`imageDetail.${imageDetail}`)}
                  </span>
                </button>
              )}

              {/* Save Draft */}
              {!generating && (
                <>
                  <div className='my-1 border-t border-[var(--border-mid)]' />
                  <button
                    type='button'
                    onClick={() => {
                      setIsToolsOpen(false);
                      (
                        document.getElementById(
                          'sticky-save-btn'
                        ) as HTMLButtonElement
                      )?.click();
                    }}
                    className='w-full flex items-center gap-2 px-3 py-2.5 text-[13px] text-[var(--fg)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer'
                  >
                    <svg
                      width='16'
                      height='16'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='1.75'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    >
                      <path d='M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z' />
                      <polyline points='17 21 17 13 7 13 7 21' />
                      <polyline points='7 3 7 8 15 8' />
                    </svg>
                    {tMain('save')}
                  </button>
                </>
              )}
            </div>,
            document.body
          )}

        {/* Desktop pushes the model/gear/save/send group right; on mobile the row
            wraps instead, so the spacer would just create an awkward gap. */}
        <div className='hidden md:block flex-1' />

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
              className='flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)] text-[12px] font-medium whitespace-nowrap hover:bg-[var(--accent)]/[0.16] transition-colors cursor-pointer'
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
                  className='fixed z-[9999] min-w-[240px] max-w-[320px] rounded-[10px] border border-[var(--border-mid)] bg-[var(--bg-card)] shadow-[var(--shadow-float)] flex flex-col-reverse'
                >
                  <div className='px-2 pb-2 pt-1 border-t border-[var(--border-mid)]'>
                    <input
                      ref={searchRef}
                      type='text'
                      value={modelSearch}
                      onChange={(e) => setModelSearch(e.target.value)}
                      placeholder={t('searchModels')}
                      className='w-full px-2.5 py-1.5 text-[12px] rounded-[6px] border border-[var(--border-mid)] bg-[var(--bg-elevated)] text-[var(--fg)] placeholder-[var(--fg-3)] focus:outline-none focus:border-[var(--accent)]'
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
                              ? 'bg-[var(--accent)] text-[var(--accent-fg)] font-medium'
                              : 'text-[var(--fg)] hover:bg-[var(--bg-hover)]'
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
              className='flex items-center px-2 py-1.5 rounded-lg border border-[var(--border-mid)] bg-[var(--bg-hover)] text-[var(--fg-2)] hover:bg-[var(--bg-sand)] hover:text-[var(--fg)] transition-colors cursor-pointer'
              aria-label='Chat configuration'
            >
              <GearIcon />
            </button>
            {hasNonDefaults && (
              <span className='absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[var(--accent)] pointer-events-none' />
            )}
          </div>
        )}

        {!generating && (
          <button
            className='flex items-center gap-1.5 px-3 py-1.5 max-md:min-h-[44px] rounded-lg bg-[var(--accent)] text-[var(--accent-fg)] text-[13px] font-medium hover:bg-[var(--accent-hover)] transition-colors duration-150 cursor-pointer border-0'
            onClick={() =>
              (
                document.getElementById(
                  'sticky-generate-btn'
                ) as HTMLButtonElement
              )?.click()
            }
            aria-label={tMain('generate') as string}
          >
            <Icon name="send" />
            {tMain('generate')}
          </button>
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
