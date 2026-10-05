import React, { useEffect, useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useTranslation } from 'react-i18next';

import useStore from '@store/store';
import useGStore from '@store/cloud-auth-store';

import {
  createDriveFile,
  deleteDriveFile,
  updateDriveFileName,
  validateGoogleOath2AccessToken,
} from '@api/google-api';
import { getFiles, stateToFile } from '@utils/google-api';
import {
  startCloudSync,
  stopCloudSync,
} from '@store/storage/GoogleCloudStorage';

import GoogleSyncButton from './GoogleSyncButton';
import Dialog from '@components/Dialog';

import Icon from '@components/Icon';

import { GoogleFileResource, SyncStatus } from '@type/google-api';

const GoogleSync = ({ clientId }: { clientId: string }) => {
  const { t } = useTranslation(['drive']);

  const fileId = useGStore((state) => state.fileId);
  const setFileId = useGStore((state) => state.setFileId);
  const googleAccessToken = useGStore((state) => state.googleAccessToken);
  const syncStatus = useGStore((state) => state.syncStatus);
  const cloudSync = useGStore((state) => state.cloudSync);
  const setSyncStatus = useGStore((state) => state.setSyncStatus);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(cloudSync);
  const [files, setFiles] = useState<GoogleFileResource[]>([]);

  useEffect(() => {
    if (!googleAccessToken || !cloudSync) return;
    const controller = new AbortController();
    const initialise = async () => {
      try {
        setSyncStatus('syncing');
        await validateGoogleOath2AccessToken(
          googleAccessToken,
          controller.signal
        );
        const available = await getFiles(googleAccessToken, controller.signal);
        if (controller.signal.aborted) return;
        setFiles(available);
        const selected =
          available.find((file) => file.id === fileId) ?? available[0];
        const id =
          selected?.id ??
          (
            await createDriveFile(
              stateToFile(),
              googleAccessToken,
              undefined,
              controller.signal
            )
          ).id;
        if (controller.signal.aborted) return;
        setFileId(id);
        await startCloudSync(id, googleAccessToken);
        if (!controller.signal.aborted)
          setFiles(await getFiles(googleAccessToken, controller.signal));
      } catch (error) {
        if (controller.signal.aborted) return;
        setSyncStatus('unauthenticated');
        useStore
          .getState()
          .addToast(
            'error',
            error instanceof Error
              ? error.message
              : 'Could not connect to Google Drive. Local data is saved.'
          );
      }
    };
    void initialise();
    return () => {
      controller.abort();
      stopCloudSync();
    };
    // Selection changes are handled explicitly in the dialog, without
    // restarting a session during the initial setFileId operation.
  }, [googleAccessToken, cloudSync]);

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <button
        className='flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--fg-2)] text-[13px] transition-colors cursor-pointer'
        onClick={() => {
          setIsModalOpen(true);
        }}
      >
        <Icon name='google' /> {t('name')}
        {cloudSync && <SyncIcon status={syncStatus} />}
      </button>
      {isModalOpen && (
        <GooglePopup
          setIsModalOpen={setIsModalOpen}
          files={files}
          setFiles={setFiles}
        />
      )}
    </GoogleOAuthProvider>
  );
};

const GooglePopup = ({
  setIsModalOpen,
  files,
  setFiles,
}: {
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  files: GoogleFileResource[];
  setFiles: React.Dispatch<React.SetStateAction<GoogleFileResource[]>>;
}) => {
  const { t } = useTranslation(['drive']);

  const syncStatus = useGStore((state) => state.syncStatus);
  const cloudSync = useGStore((state) => state.cloudSync);
  const googleAccessToken = useGStore((state) => state.googleAccessToken);
  const setFileId = useGStore((state) => state.setFileId);

  const addToast = useStore((state) => state.addToast);

  const selectedFileId = useGStore((state) => state.fileId);
  const [isCreating, setIsCreating] = useState(false);
  const [_fileId, _setFileId] = useState<string>(
    useGStore.getState().fileId || ''
  );

  useEffect(() => {
    _setFileId(selectedFileId ?? '');
  }, [selectedFileId]);

  const createSyncFile = async () => {
    if (!googleAccessToken) return;
    try {
      setIsCreating(true);
      await createDriveFile(stateToFile(), googleAccessToken);
      const _files = await getFiles(googleAccessToken);
      if (_files) setFiles(_files);
    } catch (e: unknown) {
      addToast('error', (e as Error).message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog
      title={t('name') as string}
      setIsModalOpen={setIsModalOpen}
      cancelButton={false}
    >
      <div className='p-6 border-b border-[var(--border)] text-[var(--fg-2)] text-sm flex flex-col items-center gap-4 text-center'>
        <p>{t('tagline')}</p>
        <GoogleSyncButton loginHandler={() => setIsModalOpen(false)} />
        <p className='border border-[var(--border-mid)] px-3 py-2 rounded-lg text-[var(--fg-2)]'>
          {t('notice')}
        </p>
        {cloudSync && syncStatus !== 'unauthenticated' && (
          <div className='flex flex-col gap-2 items-center'>
            {files.map((file) => (
              <FileSelector
                id={file.id}
                name={file.name}
                _fileId={_fileId}
                _setFileId={_setFileId}
                setFiles={setFiles}
                key={file.id}
              />
            ))}
            {syncStatus !== 'syncing' && (
              <div className='flex gap-4 flex-wrap justify-center'>
                <button
                  type='button'
                  className='btn btn-primary cursor-pointer'
                  onClick={async () => {
                    if (!googleAccessToken || !_fileId) return;
                    try {
                      await startCloudSync(_fileId, googleAccessToken);
                      setFileId(_fileId);
                      addToast('success', t('toast.sync'));
                      setIsModalOpen(false);
                    } catch {
                      /* Sync service preserves local data and reports failure. */
                    }
                  }}
                >
                  {t('button.confirm')}
                </button>
                <button
                  type='button'
                  className='btn btn-neutral cursor-pointer'
                  disabled={isCreating}
                  onClick={createSyncFile}
                >
                  {isCreating
                    ? t('creating', { defaultValue: 'Creating…' })
                    : t('button.create')}
                </button>
              </div>
            )}
            <div className='h-4 w-4'>
              {syncStatus === 'syncing' && <SyncIcon status='syncing' />}
            </div>
          </div>
        )}
        <p>{t('privacy')}</p>
        <p className='text-xs text-[var(--fg-3)]'>{t('snapshotsNotice')}</p>
      </div>
    </Dialog>
  );
};

const FileSelector = ({
  name,
  id,
  _fileId,
  _setFileId,
  setFiles,
}: {
  name: string;
  id: string;
  _fileId: string;
  _setFileId: React.Dispatch<React.SetStateAction<string>>;
  setFiles: React.Dispatch<React.SetStateAction<GoogleFileResource[]>>;
}) => {
  const syncStatus = useGStore((state) => state.syncStatus);

  const addToast = useStore((state) => state.addToast);

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [_name, _setName] = useState<string>(name);

  const [isWorking, setIsWorking] = useState(false);
  const syncing = syncStatus === 'syncing' || isWorking;

  const updateFileName = async () => {
    if (syncing) return;
    setIsEditing(false);
    const accessToken = useGStore.getState().googleAccessToken;
    if (!accessToken) return;

    try {
      setIsWorking(true);
      const newFileName = _name.endsWith('.json') ? _name : _name + '.json';
      await updateDriveFileName(newFileName, id, accessToken);
      const _files = await getFiles(accessToken);
      if (_files) setFiles(_files);
    } catch (e: unknown) {
      addToast('error', (e as Error).message);
    } finally {
      setIsWorking(false);
    }
  };

  const deleteFile = async () => {
    if (syncing) return;
    setIsDeleting(false);
    const accessToken = useGStore.getState().googleAccessToken;
    if (!accessToken) return;

    try {
      setIsWorking(true);
      if (useGStore.getState().fileId === id) {
        stopCloudSync();
        useGStore.getState().setCloudSync(false);
        useGStore.getState().setFileId(undefined);
      }
      await deleteDriveFile(id, accessToken);
      const _files = await getFiles(accessToken);
      if (_files) setFiles(_files);
    } catch (e: unknown) {
      addToast('error', (e as Error).message);
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div
      className={`w-full flex items-center justify-between mb-2 gap-2 text-sm font-medium text-[var(--fg-btn)] ${
        syncing ? 'cursor-not-allowed opacity-40' : ''
      }`}
    >
      <input
        type='radio'
        aria-label={name}
        name='drive-backup-selection'
        checked={_fileId === id}
        className='w-4 h-4'
        onChange={() => {
          if (!syncing) _setFileId(id);
        }}
        disabled={syncing}
      />
      <div className='flex-1 text-left'>
        {isEditing ? (
          <input
            type='text'
            aria-label='Backup filename'
            className='text-[var(--fg)] p-3 text-sm border-none bg-[var(--bg-sand)] rounded-lg m-0 w-full mr-0 h-8 focus:outline-none'
            value={_name}
            onChange={(e) => {
              _setName(e.target.value);
            }}
          />
        ) : (
          <>
            {name} <div className='text-[10px] md:text-xs'>{`<${id}>`}</div>
          </>
        )}
      </div>
      {isDeleting && (
        <span className='text-xs text-[var(--error)]'>
          Delete this backup entry? Snapshot history remains in Drive.
        </span>
      )}
      {isEditing || isDeleting ? (
        <div className='flex gap-1'>
          <button
            type='button'
            disabled={syncing}
            aria-label={isEditing ? 'Confirm rename' : 'Confirm deletion'}
            className={`${syncing ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            onClick={() => {
              if (isEditing) updateFileName();
              if (isDeleting) deleteFile();
            }}
          >
            <Icon name='tick' />
          </button>
          <button
            type='button'
            disabled={syncing}
            aria-label='Cancel'
            className={`${syncing ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            onClick={() => {
              if (!syncing) {
                setIsEditing(false);
                setIsDeleting(false);
              }
            }}
          >
            <Icon name='cross' />
          </button>
        </div>
      ) : (
        <div className='flex gap-1'>
          <button
            type='button'
            disabled={syncing}
            aria-label={`Rename ${name}`}
            className={`${syncing ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            onClick={() => {
              if (!syncing) setIsEditing(true);
            }}
          >
            <Icon name='edit' />
          </button>
          <button
            type='button'
            disabled={syncing}
            aria-label={`Delete ${name}`}
            className={`${syncing ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            onClick={() => {
              if (!syncing) setIsDeleting(true);
            }}
          >
            <Icon name='delete' />
          </button>
        </div>
      )}
    </div>
  );
};

const SyncIcon = ({ status }: { status: SyncStatus }) => {
  const statusToIcon = {
    unauthenticated: (
      <div className='bg-red-600/80 rounded-full w-4 h-4 text-xs flex justify-center items-center'>
        !
      </div>
    ),
    syncing: (
      <div className='bg-gray-600/80 rounded-full p-1 animate-spin'>
        <Icon name='refresh' className='h-2 w-2' />
      </div>
    ),
    synced: (
      <div className='bg-gray-600/80 rounded-full p-1'>
        <Icon name='tick' className='h-2 w-2' />
      </div>
    ),
  };
  return statusToIcon[status] || null;
};

export default GoogleSync;
