import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import useStore from '@store/store';

import Icon from '@components/Icon';
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
    <button
      type='button'
      disabled={generating}
      aria-label={t('newFolder')}
      className={`flex items-center justify-center rounded-lg border border-[var(--border-mid)] bg-[var(--bg-hover)] text-[var(--fg-2)] hover:bg-[var(--bg-sand)] hover:text-[var(--fg)] transition-colors duration-150 shrink-0 w-11 h-11 ${
        generating
          ? 'cursor-not-allowed opacity-40'
          : 'cursor-pointer opacity-100'
      }`}
      onClick={() => {
        if (!generating) addFolder();
      }}
    >
      <Icon name='newFolder' />
    </button>
  );
};

export default NewFolder;
