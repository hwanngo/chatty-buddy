import React, { useEffect, useRef, useState } from 'react';
import useStore from '@store/store';
import { useTranslation } from 'react-i18next';

import PopupModal from '@components/PopupModal';
import { Prompt } from '@type/prompt';
import PlusIcon from '@icon/PlusIcon';
import CrossIcon from '@icon/CrossIcon';
import { v4 as uuidv4 } from 'uuid';
import ImportPrompt from './ImportPrompt';
import ExportPrompt from './ExportPrompt';

const PromptLibraryMenu = () => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  return (
    <div>
      <button
        className='btn btn-neutral'
        onClick={() => setIsModalOpen(true)}
        aria-label={t('promptLibrary') as string}
      >
        {t('promptLibrary')}
      </button>
      {isModalOpen && (
        <PromptLibraryMenuPopUp setIsModalOpen={setIsModalOpen} />
      )}
    </div>
  );
};

const PromptLibraryMenuPopUp = ({
  setIsModalOpen,
}: {
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const { t } = useTranslation();

  const setPrompts = useStore((state) => state.setPrompts);
  const prompts = useStore((state) => state.prompts);

  const [_prompts, _setPrompts] = useState<Prompt[]>(
    JSON.parse(JSON.stringify(prompts))
  );
  const container = useRef<HTMLDivElement>(null);

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    target.style.height = 'auto';
    target.style.height = `${target.scrollHeight}px`;
    target.style.maxHeight = `${target.scrollHeight}px`;
  };

  const handleSave = () => {
    setPrompts(_prompts);
    setIsModalOpen(false);
  };

  const addPrompt = () => {
    const updatedPrompts: Prompt[] = JSON.parse(JSON.stringify(_prompts));
    updatedPrompts.push({
      id: uuidv4(),
      name: '',
      prompt: '',
    });
    _setPrompts(updatedPrompts);
  };

  const deletePrompt = (index: number) => {
    const updatedPrompts: Prompt[] = JSON.parse(JSON.stringify(_prompts));
    updatedPrompts.splice(index, 1);
    _setPrompts(updatedPrompts);
  };

  const clearPrompts = () => {
    _setPrompts([]);
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

  useEffect(() => {
    _setPrompts(prompts);
  }, [prompts]);

  return (
    <PopupModal
      title={t('promptLibrary') as string}
      setIsModalOpen={setIsModalOpen}
      handleConfirm={handleSave}
    >
      <div className='w-[90vw] max-w-2xl text-sm text-[#141413] dark:text-[#faf9f5]'>
        {/* Import / Export */}
        <div className='flex flex-col gap-5 px-6 py-5 border-b border-[#e8e6dc] dark:border-[#30302e]'>
          <ImportPrompt />
          <ExportPrompt />
        </div>

        {/* Prompt table */}
        <div className='flex flex-col px-6 py-4' ref={container}>
          <div className='flex font-medium border-b border-[#e8e6dc] dark:border-[#30302e] pb-2 mb-1 text-[#87867f] dark:text-[#6b6a65] text-xs uppercase tracking-wide'>
            <div className='sm:w-1/4 max-sm:flex-1'>{t('name')}</div>
            <div className='flex-1'>{t('prompt')}</div>
          </div>
          {_prompts.map((prompt, index) => (
            <div
              key={prompt.id}
              className='flex items-center border-b border-[#e8e6dc] dark:border-[#30302e] py-1'
            >
              <div className='sm:w-1/4 max-sm:flex-1'>
                <textarea
                  className='m-0 resize-none rounded-lg bg-transparent overflow-y-hidden leading-7 p-1 focus:ring-1 focus:ring-[#c96442] w-full max-h-10 transition-all text-[#141413] dark:text-[#faf9f5]'
                  onFocus={handleOnFocus}
                  onBlur={handleOnBlur}
                  onChange={(e) => {
                    _setPrompts((prev) => {
                      const newPrompts = [...prev];
                      newPrompts[index].name = e.target.value;
                      return newPrompts;
                    });
                  }}
                  onInput={handleInput}
                  value={prompt.name}
                  rows={1}
                ></textarea>
              </div>
              <div className='flex-1'>
                <textarea
                  className='m-0 resize-none rounded-lg bg-transparent overflow-y-hidden leading-7 p-1 focus:ring-1 focus:ring-[#c96442] w-full max-h-10 transition-all text-[#141413] dark:text-[#faf9f5]'
                  onFocus={handleOnFocus}
                  onBlur={handleOnBlur}
                  onChange={(e) => {
                    _setPrompts((prev) => {
                      const newPrompts = [...prev];
                      newPrompts[index].prompt = e.target.value;
                      return newPrompts;
                    });
                  }}
                  onInput={handleInput}
                  value={prompt.prompt}
                  rows={1}
                ></textarea>
              </div>
              <button
                className='p-1 ml-1 text-[#87867f] hover:text-[#141413] dark:hover:text-[#faf9f5] transition-colors cursor-pointer'
                onClick={() => deletePrompt(index)}
                aria-label='delete prompt'
              >
                <CrossIcon />
              </button>
            </div>
          ))}

          <button
            className='flex justify-center mt-2 p-1 text-[#87867f] hover:text-[#141413] dark:hover:text-[#faf9f5] transition-colors cursor-pointer'
            onClick={addPrompt}
            aria-label='add prompt'
          >
            <PlusIcon />
          </button>

          <div className='flex items-center justify-between mt-3 pt-3 border-t border-[#e8e6dc] dark:border-[#30302e]'>
            <p className='text-xs text-[#87867f] dark:text-[#6b6a65]'>
              {t('morePrompts')}
              <a
                href='https://github.com/f/prompts.chat'
                target='_blank'
                className='underline hover:text-[#141413] dark:hover:text-[#faf9f5] transition-colors'
              >
                prompts.chat
              </a>
            </p>
            <button
              className='btn btn-small btn-neutral text-xs'
              onClick={clearPrompts}
            >
              {t('clearPrompts')}
            </button>
          </div>
        </div>
      </div>
    </PopupModal>
  );
};

export default PromptLibraryMenu;
