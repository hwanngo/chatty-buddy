import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';

import useInitialiseNewChat from '@hooks/useInitialiseNewChat';
import useHideOnOutsideClick from '@hooks/useHideOnOutsideClick';

import ChatIcon from '@icon/ChatIcon';
import CrossIcon from '@icon/CrossIcon';
import DeleteIcon from '@icon/DeleteIcon';
import EditIcon from '@icon/EditIcon';
import CloneIcon from '@icon/CloneIcon';
import TickIcon from '@icon/TickIcon';
import DownArrow from '@icon/DownArrow';
import MarkdownIcon from '@icon/MarkdownIcon';
import JsonIcon from '@icon/JsonIcon';
import useStore from '@store/store';
import { formatNumber, chatToMarkdown, downloadMarkdown } from '@utils/chat';
import downloadFile from '@utils/downloadFile';
import { ChatInterface } from '@type/chat';

const ChatHistoryClass = {
  normal:
    'flex items-center gap-2 px-2.5 py-2 mx-2 rounded-lg bg-transparent hover:bg-[#f0eee6] dark:hover:bg-[#3a3a37] group transition-[background] duration-100 cursor-pointer text-[#5e5d59] dark:text-[#b0aea5] min-w-0',
  active:
    'flex items-center gap-2 px-2.5 py-2 mx-2 rounded-lg bg-[#dedad0] dark:bg-[#3a3a37] group transition-[background] duration-100 cursor-pointer text-[#141413] dark:text-[#faf9f5] font-medium min-w-0',
};

const ChatHistory = React.memo(
  ({
    title,
    chatIndex,
    chatSize,
    selectedChats,
    setSelectedChats,
    lastSelectedIndex,
    setLastSelectedIndex,
  }: {
    title: string;
    chatIndex: number;
    chatSize?: number;
    selectedChats: number[];
    setSelectedChats: (indices: number[]) => void;
    lastSelectedIndex: number | null;
    setLastSelectedIndex: (index: number) => void;
  }) => {
    const { t } = useTranslation();
    const initialiseNewChat = useInitialiseNewChat();
    const setCurrentChatIndex = useStore((state) => state.setCurrentChatIndex);
    const setChats = useStore((state) => state.setChats);
    const active = useStore((state) => state.currentChatIndex === chatIndex);
    const generating = useStore((state) => state.generating);

    const [isDelete, setIsDelete] = useState<boolean>(false);
    const [isEdit, setIsEdit] = useState<boolean>(false);
    const [_title, _setTitle] = useState<string>(title);
    const inputRef = useRef<HTMLInputElement>(null);
    const exportBtnRef = useRef<HTMLButtonElement>(null);
    const [exportRect, setExportRect] = useState<DOMRect | null>(null);
    const [exportDropDown, setExportDropDown, exportDropDownRef] =
      useHideOnOutsideClick();

    const editTitle = () => {
      const updatedChats = JSON.parse(
        JSON.stringify(useStore.getState().chats)
      );
      updatedChats[chatIndex].title = _title;
      setChats(updatedChats);
      setIsEdit(false);
    };

    const deleteChat = () => {
      const updatedChats = JSON.parse(
        JSON.stringify(useStore.getState().chats)
      );
      const indicesToDelete =
        selectedChats.length > 0 ? selectedChats : [chatIndex];
      indicesToDelete
        .sort((a, b) => b - a)
        .forEach((index) => {
          updatedChats.splice(index, 1);
        });
      if (updatedChats.length > 0) {
        setCurrentChatIndex(0);
        setChats(updatedChats);
      } else {
        initialiseNewChat();
      }
      setIsDelete(false);
      setSelectedChats([]);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        editTitle();
      }
    };

    const handleTick = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();

      if (isEdit) editTitle();
      else if (isDelete) deleteChat();
    };

    const handleCross = () => {
      setIsDelete(false);
      setIsEdit(false);
    };

    const handleDragStart = (e: React.DragEvent<HTMLAnchorElement>) => {
      if (e.dataTransfer) {
        const chatIndices =
          selectedChats.length > 0 ? selectedChats : [chatIndex];
        e.dataTransfer.setData('chatIndices', JSON.stringify(chatIndices));
      }
    };

    const handleCheckboxClick = (e: React.MouseEvent<HTMLInputElement>) => {
      if (e.shiftKey && lastSelectedIndex !== null) {
        const start = Math.min(lastSelectedIndex, chatIndex);
        const end = Math.max(lastSelectedIndex, chatIndex);
        const newSelectedChats = [...selectedChats];
        for (let i = start; i <= end; i++) {
          if (!newSelectedChats.includes(i)) {
            newSelectedChats.push(i);
          }
        }
        setSelectedChats(newSelectedChats);
      } else {
        if (selectedChats.includes(chatIndex)) {
          setSelectedChats(
            selectedChats.filter((index) => index !== chatIndex)
          );
        } else {
          setSelectedChats([...selectedChats, chatIndex]);
        }
        setLastSelectedIndex(chatIndex);
      }
    };

    const handleExportClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (exportBtnRef.current)
        setExportRect(exportBtnRef.current.getBoundingClientRect());
      setExportDropDown((prev) => !prev);
    };

    const handleDownloadMarkdown = (e: React.MouseEvent) => {
      e.stopPropagation();
      const chats = useStore.getState().chats;
      if (chats?.[chatIndex]) {
        const markdown = chatToMarkdown(chats[chatIndex]);
        downloadMarkdown(markdown, chats[chatIndex].title);
      }
      setExportDropDown(false);
    };

    const handleDownloadJson = (e: React.MouseEvent) => {
      e.stopPropagation();
      const chats = useStore.getState().chats;
      if (chats?.[chatIndex]) {
        downloadFile(chats[chatIndex], chats[chatIndex].title);
      }
      setExportDropDown(false);
    };

    const handleClone = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      const chats = useStore.getState().chats;
      if (chats) {
        const index = chatIndex;
        let title = `Copy of ${chats[index].title}`;
        let i = 0;
        while (chats.some((chat: { title: string }) => chat.title === title)) {
          i += 1;
          title = `Copy ${i} of ${chats[index].title}`;
        }

        const clonedChat = JSON.parse(JSON.stringify(chats[index]));
        clonedChat.title = title;

        const updatedChats: ChatInterface[] = JSON.parse(JSON.stringify(chats));
        updatedChats.unshift(clonedChat);

        setChats(updatedChats);
        setCurrentChatIndex(useStore.getState().currentChatIndex + 1);
      }
    };

    useEffect(() => {
      if (inputRef && inputRef.current) inputRef.current.focus();
    }, [isEdit]);

    const [isHovered, setIsHovered] = useState<boolean>(false);

    return (
      <a
        className={`relative ${
          active ? ChatHistoryClass.active : ChatHistoryClass.normal
        } ${
          generating
            ? 'cursor-not-allowed opacity-40'
            : 'cursor-pointer opacity-100'
        }`}
        onClick={() => {
          if (!generating) setCurrentChatIndex(chatIndex);
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        draggable
        onDragStart={handleDragStart}
      >
        <span
          className={
            active ? 'text-[#c96442]' : 'text-[#5e5d59] dark:text-[#87867f]'
          }
        >
          <ChatIcon />
        </span>
        <div
          className={`flex-1 overflow-hidden text-ellipsis whitespace-nowrap relative text-[13px] ${
            active || isHovered ? 'pr-24' : ''
          }`}
          title={`${title}${chatSize ? ` (${formatNumber(chatSize)})` : ''}`}
        >
          {isEdit ? (
            <input
              type='text'
              className='focus:outline-[#3898ec] text-[13px] border-none bg-transparent p-0 m-0 w-full'
              value={_title}
              onChange={(e) => {
                _setTitle(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              ref={inputRef}
            />
          ) : (
            `${title}${chatSize ? ` (${formatNumber(chatSize)})` : ''}`
          )}
        </div>
        {(active || isHovered) && (
          <div className='absolute flex right-1 z-10 text-[#87867f] dark:text-[#b0aea5] visible'>
            {isDelete || isEdit ? (
              <>
                <button
                  className='p-1 hover:text-[#141413] dark:hover:text-[#faf9f5] cursor-pointer'
                  onClick={handleTick}
                  aria-label='confirm'
                  title={t('confirm')}
                >
                  <TickIcon />
                </button>
                <button
                  className='p-1 hover:text-[#141413] dark:hover:text-[#faf9f5] cursor-pointer'
                  onClick={handleCross}
                  aria-label='cancel'
                  title={t('cancel')}
                >
                  <CrossIcon />
                </button>
              </>
            ) : (
              <>
                <button
                  className='p-1 hover:text-[#141413] dark:hover:text-[#faf9f5] cursor-pointer'
                  onClick={() => setIsEdit(true)}
                  aria-label='edit chat title'
                  title={t('rename')}
                >
                  <EditIcon />
                </button>
                <button
                  className='p-1 hover:text-[#141413] dark:hover:text-[#faf9f5] cursor-pointer'
                  onClick={handleClone}
                  aria-label='clone chat'
                  title={t('cloneChat')}
                >
                  <CloneIcon />
                </button>
                <div ref={exportDropDownRef}>
                  <button
                    ref={exportBtnRef}
                    className='p-1 hover:text-[#141413] dark:hover:text-[#faf9f5] cursor-pointer'
                    onClick={handleExportClick}
                    aria-label='download chat'
                    title={t('downloadChat')}
                  >
                    <DownArrow className='w-4 h-4' />
                  </button>
                  {exportDropDown &&
                    exportRect &&
                    ReactDOM.createPortal(
                      <div
                        onMouseDown={(e) => e.stopPropagation()}
                        style={{
                          position: 'fixed',
                          top: exportRect.bottom + 4,
                          left: exportRect.left,
                          zIndex: 9999,
                        }}
                        className='bg-[#faf9f5] dark:bg-[#30302e] border border-[#e8e6dc] dark:border-[#3d3d3a] rounded-lg shadow-xl overflow-hidden min-w-[140px]'
                      >
                        <button
                          className='flex items-center gap-2 w-full px-3 py-2 text-[13px] text-[#5e5d59] dark:text-[#b0aea5] hover:bg-[#f0eee6] dark:hover:bg-[#3a3a37] hover:text-[#141413] dark:hover:text-[#faf9f5] transition-colors cursor-pointer'
                          onClick={handleDownloadMarkdown}
                        >
                          <MarkdownIcon />
                          Markdown
                        </button>
                        <button
                          className='flex items-center gap-2 w-full px-3 py-2 text-[13px] text-[#5e5d59] dark:text-[#b0aea5] hover:bg-[#f0eee6] dark:hover:bg-[#3a3a37] hover:text-[#141413] dark:hover:text-[#faf9f5] transition-colors cursor-pointer'
                          onClick={handleDownloadJson}
                        >
                          <JsonIcon />
                          JSON
                        </button>
                      </div>,
                      document.body
                    )}
                </div>
                <button
                  className='p-1 hover:text-[#141413] dark:hover:text-[#faf9f5] cursor-pointer'
                  onClick={() => setIsDelete(true)}
                  aria-label='delete chat'
                  title={t('delete')}
                >
                  <DeleteIcon />
                </button>
              </>
            )}
          </div>
        )}
      </a>
    );
  }
);

export default ChatHistory;
