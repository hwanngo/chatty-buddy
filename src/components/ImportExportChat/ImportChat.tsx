import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';

import useStore from '@store/store';

import {
  importOpenAIChatExport,
  isLegacyImport,
  isOpenAIContent,
  PartialImportError,
  validateAndFixChats,
  validateExportV1,
} from '@utils/import';

import { modelOptions } from '@constants/modelLoader';

// Helper to detect and warn about unknown model IDs referenced in imported chats
const warnUnsupportedModels = (
  chats: any[],
  t: (key: string, opts?: any) => string
) => {
  const unsupportedModels = Array.from(
    new Set(
      chats
        .map((c: any) => c?.config?.model)
        .filter((id: string | undefined) => id && !modelOptions.includes(id))
    )
  );

  if (unsupportedModels.length > 0) {
    const msg =
      t('notifications.unsupportedModels', {
        ns: 'import',
        models: unsupportedModels.join(', '),
      }) ||
      `Unsupported model(s): ${unsupportedModels.join(', ')}. Please add them in Settings → Custom Models before importing.`;
    useStore.getState().setToastMessage(msg);
    useStore.getState().setToastStatus('warning');
    useStore.getState().setToastShow(true);
    return true;
  }
  return false;
};

import { ChatInterface, Folder, FolderCollection } from '@type/chat';
import { ExportBase } from '@type/export';

type ImportResult = {
  success: boolean;
  message: string;
};

const ImportChat = () => {
  const { t } = useTranslation(['main', 'import']);
  const setChats = useStore.getState().setChats;
  const setFolders = useStore.getState().setFolders;
  const inputRef = useRef<HTMLInputElement>(null);
  const [alert, setAlert] = useState<{
    message: string;
    success: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileUpload = () => {
    if (!inputRef || !inputRef.current) return;
    const file = inputRef.current.files?.[0];
    if (file) setIsLoading(true);
    var shouldAllowPartialImport = false;
    if (file) {
      const reader = new FileReader();

      reader.onload = async (event) => {
        const data = event.target?.result as string;
        const originalChats = JSON.parse(
          JSON.stringify(useStore.getState().chats)
        );
        const originalFolders = JSON.parse(
          JSON.stringify(useStore.getState().folders)
        );
        var originalParsedData: any;
        const importData = async (
          parsedData: any,
          shouldReduce = false,
          type: string = ''
        ): Promise<ImportResult> => {
          let chatsToImport = parsedData;
          let removedChatsCount = 0;
          while (true) {
            try {
              if (type === 'OpenAIContent' || isOpenAIContent(chatsToImport)) {
                const chats = importOpenAIChatExport(
                  chatsToImport,
                  shouldAllowPartialImport
                );
                const prevChats: ChatInterface[] = JSON.parse(
                  JSON.stringify(useStore.getState().chats)
                );
                setChats(chats.concat(prevChats));
                if (removedChatsCount > 0) {
                  useStore
                    .getState()
                    .setToastMessage(
                      `${t('reduceMessagesSuccess', { count: removedChatsCount })}. ${t('notifications.chatsImported', { ns: 'import', imported: chats.length, total: originalParsedData.length })}`
                    );
                  useStore.getState().setToastStatus('success');
                  useStore.getState().setToastShow(true);
                }
                if (chats.length > 0) {
                  return {
                    success: true,
                    message: t('notifications.successfulImport', {
                      ns: 'import',
                    }),
                  };
                } else {
                  return {
                    success: false,
                    message: t('notifications.quotaExceeded', {
                      ns: 'import',
                    }),
                  };
                }
              } else if (
                type === 'LegacyImport' ||
                isLegacyImport(chatsToImport)
              ) {
                if (validateAndFixChats(chatsToImport)) {
                  // import new folders
                  const folderNameToIdMap: Record<string, string> = {};
                  const parsedFolders: string[] = [];

                  chatsToImport.forEach((data) => {
                    const folder = data.folder;
                    if (folder) {
                      if (!parsedFolders.includes(folder)) {
                        parsedFolders.push(folder);
                        folderNameToIdMap[folder] = uuidv4();
                      }
                      data.folder = folderNameToIdMap[folder];
                    }
                  });

                  const newFolders: FolderCollection = parsedFolders.reduce(
                    (acc, curr, index) => {
                      const id = folderNameToIdMap[curr];
                      const _newFolder: Folder = {
                        id,
                        name: curr,
                        expanded: false,
                        order: index,
                      };
                      return { [id]: _newFolder, ...acc };
                    },
                    {}
                  );

                  // increment the order of existing folders
                  const offset = parsedFolders.length;

                  const updatedFolders = useStore.getState().folders;
                  Object.values(updatedFolders).forEach(
                    (f) => (f.order += offset)
                  );

                  setFolders({ ...newFolders, ...updatedFolders });

                  // import chats
                  const prevChats = useStore.getState().chats;
                  if (prevChats) {
                    const updatedChats: ChatInterface[] = JSON.parse(
                      JSON.stringify(prevChats)
                    );
                    setChats(chatsToImport.concat(updatedChats));
                  } else {
                    setChats(chatsToImport);
                  }
                  if (removedChatsCount > 0) {
                    useStore
                      .getState()
                      .setToastMessage(
                        `${t('reduceMessagesSuccess', { count: removedChatsCount })}. ${t('notifications.chatsImported', { ns: 'import', imported: chatsToImport.length, total: originalParsedData.length })}`
                      );
                    useStore.getState().setToastStatus('success');
                    useStore.getState().setToastShow(true);
                  }
                  if (chatsToImport.length > 0) {
                    return {
                      success: true,
                      message: t('notifications.successfulImport', {
                        ns: 'import',
                      }),
                    };
                  } else {
                    return {
                      success: false,
                      message: t('notifications.nothingImported', {
                        ns: 'import',
                      }),
                    };
                  }
                } else {
                  // Validate unsupported model IDs and inform user
                  warnUnsupportedModels(chatsToImport, t);

                  return {
                    success: false,
                    message: t('notifications.invalidChatsDataFormat', {
                      ns: 'import',
                    }),
                  };
                }
              } else {
                switch ((parsedData as ExportBase).version) {
                  case 1:
                    if (validateExportV1(parsedData)) {
                      // increment the order of existing folders
                      const offset = Object.keys(parsedData.folders).length;

                      const updatedFolders = useStore.getState().folders;
                      Object.values(updatedFolders).forEach(
                        (f) => (f.order += offset)
                      );

                      setFolders({ ...parsedData.folders, ...updatedFolders });

                      // import chats
                      const prevChats = useStore.getState().chats;
                      if (parsedData.chats) {
                        if (prevChats) {
                          const updatedChats: ChatInterface[] = JSON.parse(
                            JSON.stringify(prevChats)
                          );
                          setChats(parsedData.chats.concat(updatedChats));
                        } else {
                          setChats(parsedData.chats);
                        }
                      }
                      if (
                        removedChatsCount > 0 &&
                        parsedData.chats &&
                        parsedData.chats.length > 0
                      ) {
                        useStore
                          .getState()
                          .setToastMessage(
                            `${t('reduceMessagesSuccess', { count: removedChatsCount })}. ${t('notifications.chatsImported', { ns: 'import', imported: originalParsedData.chats.length - removedChatsCount, total: originalParsedData.chats.length })}`
                          );
                        useStore.getState().setToastStatus('success');
                        useStore.getState().setToastShow(true);
                      }

                      if (parsedData.chats && parsedData.chats.length > 0) {
                        return {
                          success: true,
                          message: t('notifications.successfulImport', {
                            ns: 'import',
                          }),
                        };
                      } else {
                        return {
                          success: false,
                          message: t('notifications.quotaExceeded', {
                            ns: 'import',
                          }),
                        };
                      }
                    } else {
                      return {
                        success: false,
                        message: t('notifications.invalidFormatForVersion', {
                          ns: 'import',
                        }),
                      };
                    }
                  default:
                    return {
                      success: false,
                      message: t('notifications.unrecognisedDataFormat', {
                        ns: 'import',
                      }),
                    };
                }
              }
            } catch (error: unknown) {
              if ((error as DOMException).name === 'QuotaExceededError') {
                setChats(originalChats);
                setFolders(originalFolders);
                if (type === 'ExportV1') {
                  if (chatsToImport.chats.length > 0) {
                    if (shouldReduce) {
                      chatsToImport.chats.pop();
                      removedChatsCount++;
                    } else {
                      const confirmMessage = t(
                        'reduceMessagesFailedImportWarning'
                      );
                      if (window.confirm(confirmMessage)) {
                        return await importData(parsedData, true, type);
                      } else {
                        return {
                          success: false,
                          message: t('notifications.quotaExceeded', {
                            ns: 'import',
                          }),
                        };
                      }
                    }
                  } else {
                    return {
                      success: false,
                      message: t('notifications.quotaExceeded', {
                        ns: 'import',
                      }),
                    };
                  }
                } else {
                  if (chatsToImport.length > 0) {
                    if (shouldReduce) {
                      chatsToImport.pop();
                      removedChatsCount++;
                    } else {
                      const confirmMessage = t(
                        'reduceMessagesFailedImportWarning'
                      );
                      if (window.confirm(confirmMessage)) {
                        return await importData(parsedData, true, type);
                      } else {
                        return {
                          success: false,
                          message: t('notifications.quotaExceeded', {
                            ns: 'import',
                          }),
                        };
                      }
                    }
                  } else {
                    return {
                      success: false,
                      message: t('notifications.quotaExceeded', {
                        ns: 'import',
                      }),
                    };
                  }
                }
              } else if (error instanceof PartialImportError) {
                // Handle PartialImportError
                const confirmMessage = t('partialImportWarning', {
                  message: error.message,
                });

                if (window.confirm(confirmMessage)) {
                  shouldAllowPartialImport = true;
                  // User chose to continue with the partial import
                  return await importData(parsedData, true, type);
                } else {
                  // User chose not to proceed with the partial import
                  return {
                    success: false,
                    message: t('notifications.nothingImported', {
                      ns: 'import',
                    }),
                  };
                }
              } else {
                return { success: false, message: (error as Error).message };
              }
            }
          }
        };

        try {
          const parsedData = JSON.parse(data);
          originalParsedData = JSON.parse(data);
          let type = '';
          if (isOpenAIContent(parsedData)) {
            type = 'OpenAIContent';
          } else if (isLegacyImport(parsedData)) {
            type = 'LegacyImport';
          } else if ((parsedData as ExportBase).version === 1) {
            type = 'ExportV1';
          }
          const result = await importData(parsedData, false, type);
          if (result.success) {
            useStore.getState().setToastMessage(result.message);
            useStore.getState().setToastStatus('success');
            useStore.getState().setToastShow(true);
            setAlert({ message: result.message, success: true });
          } else {
            setChats(originalChats);
            setFolders(originalFolders);
            useStore.getState().setToastMessage(result.message);
            useStore.getState().setToastStatus('error');
            useStore.getState().setToastShow(true);
            setAlert({ message: result.message, success: false });
          }
        } catch (error: unknown) {
          setChats(originalChats);
          setFolders(originalFolders);
          useStore.getState().setToastMessage((error as Error).message);
          useStore.getState().setToastStatus('error');
          useStore.getState().setToastShow(true);
          setAlert({ message: (error as Error).message, success: false });
        } finally {
          setIsLoading(false);
        }
      };

      reader.readAsText(file);
    }
  };

  return (
    <div className='flex flex-col gap-3'>
      <div>
        <p className='text-sm font-semibold text-[#141413] dark:text-[#faf9f5]'>
          {t('import')} (JSON)
        </p>
        <p className='text-xs text-[#87867f] dark:text-[#6b6a65] mt-0.5'>
          {t('importDescription', {
            defaultValue:
              'Select a previously exported chat file to restore your conversations.',
          })}
        </p>
      </div>
      <input
        className='w-full text-sm file:px-3 file:py-1.5 file:mr-3 text-[#141413] file:text-[#5e5d59] dark:text-[#faf9f5] dark:file:text-[#b0aea5] rounded-lg cursor-pointer focus:outline-none bg-[#f5f3ec] file:bg-[#e8e6dc] dark:bg-[#242422] dark:file:bg-[#30302e] file:border-0 border border-[#e8e6dc] dark:border-[#3d3d3a] file:cursor-pointer file:rounded-md file:text-xs file:font-medium file:transition-colors hover:file:bg-[#dbd9cf] dark:hover:file:bg-[#3d3d3a] py-1.5'
        type='file'
        ref={inputRef}
      />
      <div>
        <button
          className='btn btn-small btn-primary disabled:opacity-50 disabled:cursor-not-allowed'
          onClick={handleFileUpload}
          disabled={isLoading}
          aria-label={t('import') as string}
        >
          {isLoading
            ? t('importing', { defaultValue: 'Importing…' })
            : t('import')}
        </button>
      </div>
      {alert && (
        <div
          className={`py-2 px-3 w-full border rounded-lg text-sm whitespace-pre-wrap ${
            alert.success
              ? 'border-green-500/50 bg-green-500/10 text-[#2d6a2d] dark:text-[#86efac]'
              : 'border-red-500/50 bg-red-500/10 text-[#b53333] dark:text-[#fca5a5]'
          }`}
        >
          {alert.message}
        </div>
      )}
    </div>
  );
};

export default ImportChat;
