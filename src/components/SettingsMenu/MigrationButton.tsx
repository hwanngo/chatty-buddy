import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PopupModal from '@components/PopupModal';

const MigrationButton = () => {
  const { t } = useTranslation(['main', 'migration'], { useSuspense: false });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleMigration = () => {
    const storageKey = 'chatty-buddy';
    const persistedStateJSON = localStorage.getItem(storageKey);

    if (persistedStateJSON) {
      const persistedState = JSON.parse(persistedStateJSON);

      // Set the version to the desired number (e.g., 8 by default)
      persistedState.version = 8;

      // Save it back to localStorage
      localStorage.setItem(storageKey, JSON.stringify(persistedState));

      // Reload the page to re-initialize the store and trigger migrations
      window.location.reload();
    } else {
      alert(
        t('migration.noPersistedState', {
          defaultValue: 'No persisted state found. Unable to reset version.',
          ns: 'migration',
        }) as string
      );
    }
  };

  return (
    <div className='flex flex-col gap-2 w-full'>
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
      <p className='text-xs text-[#87867f] dark:text-[#6b6a65]'>
        {
          t('migration.resetVersionDescription', {
            defaultValue:
              'This will reset the version and trigger migrations.',
            ns: 'migration',
          }) as string
        }
      </p>

      {/* Use PopupModal with built-in buttons */}
      {isModalOpen && (
        <PopupModal
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
