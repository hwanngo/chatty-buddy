import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import useStore from '@store/store';
import { useTranslation } from 'react-i18next';
import { matchSorter } from 'match-sorter';
import { Prompt } from '@type/prompt';
import useHideOnOutsideClick from '@hooks/useHideOnOutsideClick';

const PromptLibraryPicker = ({
  onSelect,
}: {
  onSelect: (text: string) => void;
}) => {
  const { t } = useTranslation();
  const prompts = useStore((state) => state.prompts);
  const [_prompts, _setPrompts] = useState<Prompt[]>(prompts);
  const [input, setInput] = useState<string>('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [dropDown, setDropDown, dropDownRef] = useHideOnOutsideClick();

  useEffect(() => {
    if (dropDown) {
      if (inputRef.current) inputRef.current.focus();
      if (buttonRef.current) setRect(buttonRef.current.getBoundingClientRect());
    }
  }, [dropDown]);

  useEffect(() => {
    _setPrompts(
      matchSorter(useStore.getState().prompts, input, { keys: ['name'] })
    );
  }, [input]);

  useEffect(() => {
    _setPrompts(prompts);
    setInput('');
  }, [prompts]);

  return (
    <div className='relative' ref={dropDownRef}>
      <button
        ref={buttonRef}
        type='button'
        onClick={() => setDropDown(!dropDown)}
        className='text-xs px-2 py-1 rounded-md border border-[#e8e6dc] dark:border-[#3d3d3a] text-[#5e5d59] dark:text-[#b0aea5] hover:bg-[#f0eee6] dark:hover:bg-[#30302e] hover:text-[#141413] dark:hover:text-[#faf9f5] transition-colors duration-150 cursor-pointer'
        aria-label={t('promptLibrary') as string}
      >
        {t('promptLibrary')}
      </button>
      {dropDown &&
        rect &&
        ReactDOM.createPortal(
          <div
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: rect.bottom + 4,
              left: rect.left,
              zIndex: 9999,
            }}
            className='bg-[#faf9f5] rounded-lg shadow-xl border border-[#e8e6dc] dark:border-[#3d3d3a] text-[#141413] dark:text-[#faf9f5] dark:bg-[#30302e]'
          >
            <div className='border-b border-[#e8e6dc] dark:border-[#3d3d3a]'>
              <input
                ref={inputRef}
                type='text'
                className='text-[#141413] dark:text-[#faf9f5] px-4 py-2.5 text-sm border-none bg-transparent m-0 w-full focus:outline-none placeholder:text-[#87867f]'
                value={input}
                placeholder={t('search') as string}
                onChange={(e) => setInput(e.target.value)}
              />
            </div>
            <ul className='text-sm p-0 m-0 w-max max-w-sm max-md:max-w-[90vw] max-h-48 overflow-auto'>
              {_prompts.length === 0 && (
                <li className='px-4 py-3 text-[#87867f] text-xs'>
                  {t('noPrompts')}
                </li>
              )}
              {_prompts.map((cp) => (
                <li
                  key={cp.id}
                  className='px-4 py-2 hover:bg-[#f0eee6] dark:hover:bg-[#3a3a37] cursor-pointer text-start w-full'
                  onClick={() => {
                    onSelect(cp.prompt);
                    setDropDown(false);
                  }}
                >
                  {cp.name}
                </li>
              ))}
            </ul>
          </div>,
          document.body
        )}
    </div>
  );
};

export default PromptLibraryPicker;
