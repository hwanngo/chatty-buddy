import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import useStore from '@store/store';

import DownChevronArrow from '@icon/DownChevronArrow';
import { ChatInterface, Role, roles } from '@type/chat';

import useHideOnOutsideClick from '@hooks/useHideOnOutsideClick';

const roleColor: Record<string, string> = {
  system: 'text-[#87867f]',
  user: 'text-[#c96442]',
  assistant: 'text-[#5e5d59] dark:text-[#b0aea5]',
};

const RoleSelector = React.memo(
  ({
    role,
    messageIndex,
    sticky,
  }: {
    role: Role;
    messageIndex: number;
    sticky?: boolean;
  }) => {
    const { t } = useTranslation();
    const setInputRole = useStore((state) => state.setInputRole);
    const setChats = useStore((state) => state.setChats);
    const currentChatIndex = useStore((state) => state.currentChatIndex);

    const [dropDown, setDropDown, dropDownRef] = useHideOnOutsideClick();
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [rect, setRect] = useState<DOMRect | null>(null);

    useEffect(() => {
      if (dropDown && buttonRef.current) {
        setRect(buttonRef.current.getBoundingClientRect());
      }
    }, [dropDown]);

    return (
      <div className='relative inline-block' ref={dropDownRef}>
        <button
          ref={buttonRef}
          className={`flex items-center gap-1 px-2 py-1 rounded-md border border-[#e8e6dc] dark:border-[#3d3d3a] bg-transparent text-[12px] font-medium hover:bg-[#f0eee6] dark:hover:bg-[#30302e] transition-colors cursor-pointer ${roleColor[role] ?? roleColor.user}`}
          aria-label={t(role) as string}
          type='button'
          onClick={() => setDropDown((prev) => !prev)}
        >
          {t(role)}
          <DownChevronArrow className='w-[11px] h-[11px]' />
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
              className='bg-white dark:bg-[#30302e] border border-[#e8e6dc] dark:border-[#3d3d3a] rounded-lg shadow-[rgba(0,0,0,0.10)_0px_8px_32px] overflow-hidden min-w-[110px]'
            >
              <ul className='text-sm p-0 m-0 list-none'>
                {roles.map((r) => (
                  <li
                    key={r}
                    className={`px-3.5 py-2 text-[13px] cursor-pointer transition-colors ${
                      r === role
                        ? 'bg-[#f0eee6] dark:bg-[#3a3a37] text-[#141413] dark:text-[#faf9f5] font-medium'
                        : 'text-[#5e5d59] dark:text-[#b0aea5] hover:bg-[#f0eee6] dark:hover:bg-[#3a3a37]'
                    }`}
                    onClick={() => {
                      if (!sticky) {
                        const updatedChats: ChatInterface[] = JSON.parse(
                          JSON.stringify(useStore.getState().chats)
                        );
                        updatedChats[currentChatIndex].messages[
                          messageIndex
                        ].role = r;
                        setChats(updatedChats);
                      } else {
                        setInputRole(r);
                      }
                      setDropDown(false);
                    }}
                  >
                    {t(r)}
                  </li>
                ))}
              </ul>
            </div>,
            document.body
          )}
      </div>
    );
  }
);

export default RoleSelector;
