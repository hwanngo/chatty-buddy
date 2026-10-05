import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '@store/store';
import {
  MAX_IMPORT_BYTES,
  mergeChatImport,
  parseChatImport,
} from '@utils/import';
import { modelOptions } from '@constants/modelLoader';

const ImportChat = () => {
  const { t } = useTranslation(['main', 'import']);
  const inputRef = useRef<HTMLInputElement>(null);
  const [alert, setAlert] = useState<{
    message: string;
    success: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const handleFileUpload = async () => {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setAlert({
        success: false,
        message: t('selectImportFile', {
          defaultValue: 'Choose a JSON file first.',
        }),
      });
      return;
    }
    setIsLoading(true);
    setAlert(null);
    try {
      if (file.size > MAX_IMPORT_BYTES)
        throw new Error(
          t('importTooLarge', {
            defaultValue: 'Choose a JSON file smaller than 20 MB.',
          })
        );
      const imported = parseChatImport(JSON.parse(await file.text()));
      if (!imported.chats.length)
        throw new Error(
          t('importEmpty', {
            defaultValue: 'This file contains no conversations.',
          })
        );
      // One durable transaction: a quota failure leaves chats, folders and
      // selection unchanged. Never silently truncate a user's backup.
      useStore.setState(mergeChatImport(useStore.getState(), imported));
      const unsupported = [
        ...new Set(
          imported.chats
            .map((chat) => chat.config.model)
            .filter((id) => !modelOptions.includes(id))
        ),
      ];
      if (unsupported.length)
        useStore.getState().addToast(
          'warning',
          t('notifications.unsupportedModels', {
            ns: 'import',
            models: unsupported.join(', '),
          })
        );
      setAlert({
        success: true,
        message: t('notifications.successfulImport', { ns: 'import' }),
      });
    } catch (error) {
      setAlert({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : t('importFailed', {
                defaultValue:
                  'Import failed. Your existing conversations are unchanged. Choose another file and try again.',
              }),
      });
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className='flex flex-col gap-3'>
      <div>
        <label
          htmlFor='chat-import-file'
          className='text-sm font-semibold text-[var(--fg)]'
        >
          {t('import')} (JSON)
        </label>
        <p id='chat-import-help' className='text-xs text-[var(--fg-3)] mt-0.5'>
          {t('importDescription', {
            defaultValue:
              'Select a previously exported chat file to restore your conversations.',
          })}
        </p>
      </div>
      <input
        id='chat-import-file'
        aria-describedby='chat-import-help'
        accept='.json,application/json'
        disabled={isLoading}
        className='w-full text-sm file:px-3 file:py-1.5 file:mr-3 text-[var(--fg)] file:text-[var(--fg-2)] rounded-lg cursor-pointer bg-[var(--bg-card)] file:bg-[var(--bg-sand)] file:border-0 border border-[var(--border-mid)] file:cursor-pointer file:rounded-md file:text-xs file:font-medium py-1.5'
        type='file'
        ref={inputRef}
      />
      <div>
        <button
          className='btn btn-small btn-primary disabled:opacity-50 disabled:cursor-not-allowed'
          onClick={handleFileUpload}
          disabled={isLoading}
        >
          {isLoading
            ? t('importing', { defaultValue: 'Importing…' })
            : t('import')}
        </button>
      </div>
      {alert && (
        <div
          role={alert.success ? 'status' : 'alert'}
          className={`py-2 px-3 w-full border rounded-lg text-sm whitespace-pre-wrap ${alert.success ? 'border-[var(--success)] text-[var(--success)]' : 'border-[var(--error)] text-[var(--error)]'}`}
        >
          {alert.message}
        </div>
      )}
    </div>
  );
};
export default ImportChat;
