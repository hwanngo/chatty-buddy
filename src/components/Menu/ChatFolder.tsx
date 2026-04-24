import React, { useEffect, useRef, useState } from 'react';
import useStore from '@store/store';

import Icon from '@components/Icon';
import {
  ChatHistoryInterface,
  ChatInterface,
  FolderCollection,
} from '@type/chat';

import ChatHistory from './ChatHistory';
import NewChat from './NewChat';

import { folderColorOptions } from '@constants/color';

import useHideOnOutsideClick from '@hooks/useHideOnOutsideClick';

const ChatFolder = ({
  folderChats,
  folderId,
  selectedChats,
  setSelectedChats,
  lastSelectedIndex,
  setLastSelectedIndex,
}: {
  folderChats: ChatHistoryInterface[];
  folderId: string;
  selectedChats: number[];
  setSelectedChats: (indices: number[]) => void;
  lastSelectedIndex: number | null;
  setLastSelectedIndex: (index: number) => void;
}) => {
  const folderName = useStore((state) => state.folders[folderId]?.name);
  const isExpanded = useStore((state) => state.folders[folderId]?.expanded);
  const color = useStore((state) => state.folders[folderId]?.color);
  const theme = useStore((state) => state.theme);

  const setChats = useStore((state) => state.setChats);
  const setFolders = useStore((state) => state.setFolders);

  const inputRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLDivElement>(null);
  const gradientRef = useRef<HTMLDivElement>(null);

  const [_folderName, _setFolderName] = useState<string>(folderName);
  const [isEdit, setIsEdit] = useState<boolean>(false);
  const [isDelete, setIsDelete] = useState<boolean>(false);
  const [isHover, setIsHover] = useState<boolean>(false);

  const [showPalette, setShowPalette, paletteRef] = useHideOnOutsideClick();

  const editTitle = () => {
    const updatedFolders: FolderCollection = JSON.parse(
      JSON.stringify(useStore.getState().folders)
    );
    updatedFolders[folderId].name = _folderName;
    setFolders(updatedFolders);
    setIsEdit(false);
  };

  const deleteFolder = () => {
    const updatedChats: ChatInterface[] = JSON.parse(
      JSON.stringify(useStore.getState().chats)
    );
    updatedChats.forEach((chat) => {
      if (chat.folder === folderId) delete chat.folder;
    });
    setChats(updatedChats);

    const updatedFolders: FolderCollection = JSON.parse(
      JSON.stringify(useStore.getState().folders)
    );
    delete updatedFolders[folderId];
    setFolders(updatedFolders);

    setIsDelete(false);
  };

  const updateColor = (_color?: string) => {
    const updatedFolders: FolderCollection = JSON.parse(
      JSON.stringify(useStore.getState().folders)
    );
    if (_color) updatedFolders[folderId].color = _color;
    else delete updatedFolders[folderId].color;
    setFolders(updatedFolders);
    setShowPalette(false);
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
    else if (isDelete) deleteFolder();
  };

  const handleCross = () => {
    setIsDelete(false);
    setIsEdit(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer) {
      e.stopPropagation();
      setIsHover(false);

      const updatedFolders: FolderCollection = JSON.parse(
        JSON.stringify(useStore.getState().folders)
      );
      updatedFolders[folderId].expanded = true;
      setFolders(updatedFolders);

      const chatIndices = JSON.parse(e.dataTransfer.getData('chatIndices'));
      const updatedChats: ChatInterface[] = JSON.parse(
        JSON.stringify(useStore.getState().chats)
      );
      chatIndices.forEach((chatIndex: number) => {
        updatedChats[chatIndex].folder = folderId;
      });
      setChats(updatedChats);
      setSelectedChats([]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsHover(true);
  };

  const handleDragLeave = () => {
    setIsHover(false);
  };

  const toggleExpanded = () => {
    const updatedFolders: FolderCollection = JSON.parse(
      JSON.stringify(useStore.getState().folders)
    );
    updatedFolders[folderId].expanded = !updatedFolders[folderId].expanded;
    setFolders(updatedFolders);
  };

  useEffect(() => {
    if (inputRef && inputRef.current) inputRef.current.focus();
  }, [isEdit]);

  return (
    <div
      className={`transition-colors group/folder rounded-lg mx-2 ${
        isHover ? 'bg-[var(--bg-hover)]' : ''
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div
        style={{
          background: color ? (theme === 'dark' ? color : `${color}20`) : '',
        }}
        className={`${
          color ? '' : 'hover:bg-[var(--bg-hover)]'
        } transition-colors flex py-2 px-2 items-center gap-3 relative rounded-lg break-all cursor-pointer parent-sibling`}
        onClick={toggleExpanded}
        ref={folderRef}
        onMouseEnter={() => {
          if (color && folderRef.current)
            folderRef.current.style.background =
              theme === 'dark' ? `${color}dd` : `${color}38`;
          if (gradientRef.current) gradientRef.current.style.width = '0px';
        }}
        onMouseLeave={() => {
          if (color && folderRef.current)
            folderRef.current.style.background =
              theme === 'dark' ? color : `${color}20`;
          if (gradientRef.current) gradientRef.current.style.width = '1rem';
        }}
      >
        <span
          className='h-4 w-4 shrink-0'
          style={{ color: theme === 'dark' ? undefined : color || undefined }}
        >
          <Icon name="folder" className='h-4 w-4 shrink-0' />
        </span>
        <div className='flex-1 text-ellipsis max-h-5 overflow-hidden break-all relative text-sm text-[var(--fg)]'>
          {isEdit ? (
            <input
              type='text'
              className='focus:outline-[var(--focus)] text-sm border-none bg-transparent p-0 m-0 w-full text-[var(--fg)]'
              value={_folderName}
              onChange={(e) => {
                _setFolderName(e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={handleKeyDown}
              ref={inputRef}
            />
          ) : (
            _folderName
          )}
          {isEdit || (
            <div
              ref={gradientRef}
              className='absolute inset-y-0 right-0 w-4 z-10 transition-all'
              style={{
                background:
                  color && theme === 'dark'
                    ? `linear-gradient(to left, ${color}, transparent)`
                    : undefined,
              }}
            />
          )}
        </div>
        <div
          className='flex text-[var(--fg-2)]'
          onClick={(e) => e.stopPropagation()}
        >
          {isDelete || isEdit ? (
            <>
              <button
                className='tap-target p-1 hover:text-[var(--fg)]'
                onClick={handleTick}
                aria-label='confirm'
              >
                <Icon name="tick" />
              </button>
              <button
                className='tap-target p-1 hover:text-[var(--fg)]'
                onClick={handleCross}
                aria-label='cancel'
              >
                <Icon name="cross" />
              </button>
            </>
          ) : (
            <>
              <div
                className='relative md:hidden group-hover/folder:md:inline'
                ref={paletteRef}
              >
                <button
                  className='tap-target p-1 hover:text-[var(--fg)]'
                  onClick={() => {
                    setShowPalette((prev) => !prev);
                  }}
                  aria-label='folder color'
                >
                  <Icon name="colorPalette" />
                </button>
                {showPalette && (
                  <div className='absolute left-0 bottom-0 translate-y-full p-2 z-20 bg-[var(--bg-card)] rounded-lg border border-[var(--border-mid)] shadow-[var(--shadow-float)] flex flex-col gap-2 items-center'>
                    {folderColorOptions.map((c) => (
                      <button
                        key={c}
                        style={{ background: c }}
                        className='hover:scale-90 transition-transform h-4 w-4 rounded-full'
                        onClick={() => updateColor(c)}
                        aria-label={c}
                      />
                    ))}
                    <button
                      onClick={() => updateColor()}
                      aria-label='default color'
                      className='text-[var(--fg-2)] hover:text-[var(--fg)]'
                    >
                      <Icon name="refresh" />
                    </button>
                  </div>
                )}
              </div>

              <button
                className='tap-target p-1 hover:text-[var(--fg)] md:hidden group-hover/folder:md:inline'
                onClick={() => setIsEdit(true)}
                aria-label='edit folder title'
              >
                <Icon name="edit" />
              </button>
              <button
                className='tap-target p-1 hover:text-[var(--fg)] md:hidden group-hover/folder:md:inline'
                onClick={() => setIsDelete(true)}
                aria-label='delete folder'
              >
                <Icon name="delete" />
              </button>
              <button
                className='tap-target p-1 hover:text-[var(--fg)]'
                onClick={toggleExpanded}
                aria-label='expand folder'
              >
                <Icon
                  name="downChevronArrow"
                  className={`${
                    isExpanded ? 'rotate-180' : ''
                  } transition-transform`}
                />
              </button>
            </>
          )}
        </div>
      </div>
      <div className='ml-3 pl-2 pr-1 border-l-2 border-[var(--border-mid)] flex flex-col gap-1 parent'>
        {isExpanded && <NewChat folder={folderId} />}
        {isExpanded &&
          folderChats.map((chat) => (
            <ChatHistory
              title={chat.title}
              chatIndex={chat.index}
              chatSize={chat.chatSize}
              key={`${chat.title}-${chat.index}`}
              selectedChats={selectedChats}
              setSelectedChats={setSelectedChats}
              lastSelectedIndex={lastSelectedIndex}
              setLastSelectedIndex={setLastSelectedIndex}
            />
          ))}
      </div>
    </div>
  );
};

export default ChatFolder;
