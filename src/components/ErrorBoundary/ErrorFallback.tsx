import { useState } from 'react';
import { useTranslation } from 'react-i18next';

/** Recovery must remain usable when browser storage itself is unavailable. */
const ErrorFallback = ({ onReset }: { onReset?: () => void }) => {
  const { t } = useTranslation('main', { useSuspense: false });
  const [backupError, setBackupError] = useState('');

  const downloadBackup = () => {
    setBackupError('');
    let url: string | undefined;
    try {
      // Preserve the original bytes, including malformed JSON, for recovery.
      // This runs only after the user explicitly chooses to download a backup.
      const saved = window.localStorage.getItem('chatty-buddy');
      if (saved === null) {
        setBackupError(
          t('error.noBackup', {
            defaultValue: 'No local backup was found in this browser.',
          })
        );
        return;
      }
      url = URL.createObjectURL(
        new Blob([saved], { type: 'application/json' })
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = `chatty-buddy-recovery-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      link.remove();
    } catch {
      setBackupError(
        t('error.backupUnavailable', {
          defaultValue:
            'The backup could not be read or downloaded. Allow site storage in your browser settings, then try again. Your saved data has not been cleared.',
        })
      );
    } finally {
      if (url) {
        const downloadUrl = url;
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
      }
    }
  };

  return (
    <main className='min-h-dvh flex items-center justify-center bg-[var(--bg)] px-6 py-12'>
      <section
        aria-labelledby='recovery-title'
        className='max-w-xl w-full space-y-5 text-center'
      >
        <p className='font-mono text-sm text-[var(--error)]'>
          {t('error.eyebrow', { defaultValue: 'Something went wrong' })}
        </p>
        <h1
          id='recovery-title'
          className='font-serif text-3xl font-medium text-[var(--fg)] leading-tight'
        >
          {t('error.title', {
            defaultValue: 'Let’s get you back to your chats',
          })}
        </h1>
        <p className='text-[var(--fg-2)] leading-relaxed'>
          {t('error.message', {
            defaultValue:
              'The application could not continue. Try again or reload the page.',
          })}
        </p>
        <p className='rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-left text-sm text-[var(--fg-2)] leading-relaxed'>
          {t('error.storageHelp', {
            defaultValue:
              'If browser storage is blocked or full, allow storage for this site or free device space, then reload. Download a backup before removing site data. This recovery screen never clears your saved chats.',
          })}
        </p>
        <div className='flex flex-wrap items-center justify-center gap-3'>
          {onReset && (
            <button
              type='button'
              onClick={onReset}
              className='btn btn-primary text-sm'
            >
              {t('error.retry', { defaultValue: 'Try again' })}
            </button>
          )}
          <button
            type='button'
            onClick={() => window.location.reload()}
            className='btn btn-neutral text-sm'
          >
            {t('error.reload', { defaultValue: 'Reload page' })}
          </button>
        </div>
        <div className='space-y-2 border-t border-[var(--border)] pt-5'>
          <button
            type='button'
            onClick={downloadBackup}
            className='btn btn-neutral text-sm'
          >
            {t('error.downloadBackup', {
              defaultValue: 'Download local backup',
            })}
          </button>
          <p className='text-sm text-[var(--fg-3)]'>
            {t('error.backupPrivacy', {
              defaultValue:
                'The recovery file may contain saved API keys and private conversations. Keep it private.',
            })}
          </p>
          {backupError && (
            <p role='alert' className='text-sm text-[var(--error)]'>
              {backupError}
            </p>
          )}
        </div>
      </section>
    </main>
  );
};

export default ErrorFallback;
