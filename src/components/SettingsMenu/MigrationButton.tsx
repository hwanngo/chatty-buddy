import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Dialog from '@components/Dialog';
import useStore, { createPartializedState } from '@store/store';
import { migrate, STORE_VERSION } from '@store/migrate';
import { normalizeChats, normalizeFolders } from '@utils/import';

const MigrationButton = () => {
  const { t } = useTranslation(['main', 'migration'], { useSuspense: false });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [error, setError] = useState('');
  const handleMigration = () => {
    try {
      const raw = localStorage.getItem('chatty-buddy');
      if (!raw) throw new Error('No saved state was found.');
      const envelope = JSON.parse(raw);
      const version = envelope.version ?? 0;
      if (
        !Number.isInteger(version) ||
        version < 0 ||
        version > STORE_VERSION ||
        !envelope.state ||
        typeof envelope.state !== 'object'
      ) {
        throw new Error(
          'Unsupported storage version. Export your conversations before attempting recovery.'
        );
      }
      const state = migrate(envelope.state, version);
      const chats = normalizeChats(state.chats ?? []);
      const folders = normalizeFolders(state.folders ?? {});
      if (chats.some((chat) => chat.folder && !folders[chat.folder]))
        throw new Error('Saved state refers to a missing folder.');
      // Transactional store persistence writes the actual current version.
      const allowed = Object.fromEntries(
        Object.keys(createPartializedState(useStore.getState()))
          .filter((key) => key in state)
          .map((key) => [key, state[key as keyof typeof state]])
      );
      useStore.setState({ ...allowed, chats, folders });
      setError('');
      useStore
        .getState()
        .addToast('success', 'Saved data was validated and migrated.');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Migration failed. Saved data was not replaced.'
      );
    }
  };

  return (
    <div className='flex flex-col gap-2 w-full'>
      {error && (
        <p role='alert' className='text-sm text-[var(--error)]'>
          {error}
        </p>
      )}
      <button
        className='btn btn-primary w-full justify-center'
        onClick={() => setIsModalOpen(true)}
      >
        {
          t('migration.resetVersionButton', {
            defaultValue: 'Reset Version and Migrate',
            ns: 'migration',
          }) as string
        }
      </button>
      <p className='text-xs text-[var(--fg-3)]'>
        {
          t('migration.resetVersionDescription', {
            defaultValue: 'This will reset the version and trigger migrations.',
            ns: 'migration',
          }) as string
        }
      </p>

      {/* Use Dialog with built-in buttons */}
      {isModalOpen && (
        <Dialog
          title={
            t('migration.confirmTitle', {
              defaultValue: 'Confirm Migration',
              ns: 'migration',
            }) as string
          }
          message={
            t('migration.confirmMessage', {
              defaultValue:
                'This action will reset your application state version and trigger migrations. ' +
                'Your data will be migrated to the latest version. Do you want to proceed?',
              ns: 'migration',
            }) as string
          }
          setIsModalOpen={setIsModalOpen}
          handleConfirm={() => {
            setIsModalOpen(false);
            handleMigration();
          }}
          handleClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};

export default MigrationButton;
