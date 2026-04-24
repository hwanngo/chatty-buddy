import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import useInitialiseNewChat from '@hooks/useInitialiseNewChat';

import Icon from '@components/Icon';
import MenuKit from '@components/MenuKit';
import useStore from '@store/store';
import { formatNumber, chatToMarkdown, downloadMarkdown } from '@utils/chat';
import downloadFile from '@utils/downloadFile';
import { ChatInterface } from '@type/chat';

const ChatHistoryClass = {
  normal:
    'flex items-center gap-2 px-2.5 py-2 mx-2 rounded-lg bg-transparent hover:bg-[var(--bg-hover)] group transition-[background] duration-100 cursor-pointer text-[var(--fg-2)] min-w-0',
  active:
    'flex items-center gap-2 px-2.5 py-2 mx-2 rounded-lg bg-[var(--bg-sand)] group transition-[background] duration-100 cursor-pointer text-[var(--fg)] font-medium min-w-0',
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

    const handleDownloadMarkdown = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      const chats = useStore.getState().chats;
      if (chats?.[chatIndex]) {
        const markdown = chatToMarkdown(chats[chatIndex]);
        downloadMarkdown(markdown, chats[chatIndex].title);
      }
    };

    const handleDownloadJson = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      const chats = useStore.getState().chats;
      if (chats?.[chatIndex]) {
        downloadFile(chats[chatIndex], chats[chatIndex].title);
      }
    };

    const handleClone = (e?: React.MouseEvent<HTMLButtonElement>) => {
      e?.stopPropagation();
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
            active ? 'text-[var(--accent)]' : 'text-[var(--fg-2)]'
          }
        >
          <Icon name="chat" />
        </span>
        <div
          className={`flex-1 overflow-hidden text-ellipsis whitespace-nowrap relative text-[13px] ${
            active || isHovered ? 'pr-8' : ''
          }`}
          title={`${title}${chatSize ? ` (${formatNumber(chatSize)})` : ''}`}
        >
          {isEdit ? (
            <input
              type='text'
              className='focus:outline-[var(--focus)] text-[13px] border-none bg-transparent p-0 m-0 w-full'
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
          <div className='absolute flex right-1 z-10 text-[var(--fg-3)] visible'>
            {isDelete || isEdit ? (
              <>
                <button
                  className='tap-target p-1 hover:text-[var(--fg)] cursor-pointer'
                  onClick={handleTick}
                  aria-label='confirm'
                  title={t('confirm')}
                >
                  <Icon name="tick" />
                </button>
                <button
                  className='tap-target p-1 hover:text-[var(--fg)] cursor-pointer'
                  onClick={handleCross}
                  aria-label='cancel'
                  title={t('cancel')}
                >
                  <Icon name="cross" />
                </button>
              </>
            ) : (
              <MenuKit
                ariaLabel={t('chatActions', { defaultValue: 'Chat actions' })}
                align='right'
                items={[
                  {
                    label: t('rename'),
                    icon: 'edit',
                    onClick: () => setIsEdit(true),
                  },
                  {
                    label: t('cloneChat'),
                    icon: 'clone',
                    onClick: handleClone,
                  },
                  {
                    label: `${t('downloadChat')} (Markdown)`,
                    icon: 'markdown',
                    onClick: handleDownloadMarkdown,
                  },
                  {
                    label: `${t('downloadChat')} (JSON)`,
                    icon: 'json',
                    onClick: handleDownloadJson,
                  },
                  'separator',
                  {
                    label: t('delete'),
                    icon: 'delete',
                    danger: true,
                    onClick: () => setIsDelete(true),
                  },
                ]}
              />
            )}
          </div>
        )}
      </a>
    );
  }
);

export default ChatHistory;
