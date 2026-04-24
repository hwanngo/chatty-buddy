import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import useStore from '@store/store';

import { useTranslation } from 'react-i18next';
import { matchSorter } from 'match-sorter';
import { Prompt } from '@type/prompt';

import useHideOnOutsideClick from '@hooks/useHideOnOutsideClick';
import { ContentInterface, TextContentInterface } from '@type/chat';

const CommandPrompt = ({
  _setContent,
}: {
  _setContent: React.Dispatch<React.SetStateAction<ContentInterface[]>>;
}) => {
  const { t } = useTranslation();
  const prompts = useStore((state) => state.prompts);
  const [_prompts, _setPrompts] = useState<Prompt[]>(prompts);
  const [input, setInput] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const [dropDown, setDropDown, dropDownRef] = useHideOnOutsideClick();

  useEffect(() => {
    if (dropDown) {
      if (inputRef.current) inputRef.current.focus();
      if (buttonRef.current) setRect(buttonRef.current.getBoundingClientRect());
    }
  }, [dropDown]);

  useEffect(() => {
    const filteredPrompts = matchSorter(useStore.getState().prompts, input, {
      keys: ['name'],
    });
    _setPrompts(filteredPrompts);
  }, [input]);

  useEffect(() => {
    _setPrompts(prompts);
    setInput('');
  }, [prompts]);

  return (
    <div className='relative max-wd-sm' ref={dropDownRef}>
      <button
        ref={buttonRef}
        className='flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--border-mid)] bg-transparent text-[var(--fg-2)] text-[13px] font-medium hover:bg-[var(--border)] hover:text-[var(--fg)] transition-colors duration-150 cursor-pointer'
        aria-label='prompt library'
        onClick={() => setDropDown(!dropDown)}
      >
        /
      </button>
      {dropDown &&
        rect &&
        ReactDOM.createPortal(
          <div
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              bottom: window.innerHeight - rect.top + 4,
              right: window.innerWidth - rect.right,
              zIndex: 9999,
            }}
            className='bg-[var(--bg-card)] rounded-lg shadow-[var(--shadow-float)] border border-[var(--border-mid)] text-[var(--fg)]'
          >
            <div className='px-4 pt-3 pb-2 border-b border-[var(--border-mid)]'>
              <h3 className='text-[13px] font-medium font-serif text-[var(--fg)]'>
                {t('promptLibrary')}
              </h3>
            </div>
            <ul className='text-sm text-[var(--fg)] p-0 m-0 w-max max-w-sm max-md:max-w-[90vw] max-h-48 overflow-auto'>
              {_prompts.map((cp) => (
                <li
                  className='px-4 py-2 hover:bg-[var(--border)] cursor-pointer text-start w-full'
                  onClick={() => {
                    _setContent((prev) => {
                      const currentText =
                        prev.length > 0 &&
                        (prev[0] as TextContentInterface).text !== undefined
                          ? (prev[0] as TextContentInterface).text
                          : '';
                      return [
                        {
                          type: 'text',
                          text: currentText + cp.prompt,
                        } as TextContentInterface,
                        ...prev.slice(1),
                      ];
                    });
                    setDropDown(false);
                  }}
                  key={cp.id}
                >
                  {cp.name}
                </li>
              ))}
            </ul>
            <div className='border-t border-[var(--border-mid)]'>
              <input
                ref={inputRef}
                type='text'
                className='text-[var(--fg)] px-4 py-2.5 text-sm border-none bg-transparent m-0 w-full focus:outline-none placeholder:text-[var(--fg-3)]'
                value={input}
                placeholder={t('search') as string}
                onChange={(e) => setInput(e.target.value)}
              />
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default CommandPrompt;
