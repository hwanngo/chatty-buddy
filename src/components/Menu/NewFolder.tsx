import React from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import useStore from '@store/store';

import NewFolderIcon from '@icon/NewFolderIcon';
import { Folder, FolderCollection } from '@type/chat';

const NewFolder = () => {
  const { t } = useTranslation();
  const generating = useStore((state) => state.generating);
  const setFolders = useStore((state) => state.setFolders);

  const addFolder = () => {
    let folderIndex = 1;
    let name = `New Folder ${folderIndex}`;

    const folders = useStore.getState().folders;

    while (Object.values(folders).some((folder) => folder.name === name)) {
      folderIndex += 1;
      name = `New Folder ${folderIndex}`;
    }

    const updatedFolders: FolderCollection = JSON.parse(
      JSON.stringify(folders)
    );

    const id = uuidv4();
    const newFolder: Folder = {
      id,
      name,
      expanded: false,
      order: 0,
    };

    Object.values(updatedFolders).forEach((folder) => {
      folder.order += 1;
    });

    setFolders({ [id]: newFolder, ...updatedFolders });
  };

  return (
    <a
      className={`flex items-center justify-center rounded-lg border border-[#e8e6dc] dark:border-[#3d3d3a] bg-[#f0eee6] dark:bg-[#30302e] text-[#5e5d59] dark:text-[#b0aea5] hover:bg-[#e8e6dc] dark:hover:bg-[#3a3a37] hover:text-[#141413] dark:hover:text-[#faf9f5] transition-colors duration-150 shrink-0 w-[34px] h-[34px] ${
        generating
          ? 'cursor-not-allowed opacity-40'
          : 'cursor-pointer opacity-100'
      }`}
      onClick={() => {
        if (!generating) addFolder();
      }}
    >
      <NewFolderIcon />
    </a>
  );
};

export default NewFolder;
