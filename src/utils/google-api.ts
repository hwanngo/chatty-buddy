import { listDriveFiles } from '@api/google-api';

import useStore, { createPartializedState } from '@store/store';
import useCloudAuthStore from '@store/cloud-auth-store';

export const getFiles = async (googleAccessToken: string) => {
  try {
    const driveFiles = await listDriveFiles(googleAccessToken);
    return driveFiles.files;
  } catch (e: unknown) {
    useCloudAuthStore.getState().setSyncStatus('unauthenticated');
    useStore.getState().addToast('error', (e as Error).message);
    return;
  }
};


export const stateToFile = () => {
  const partializedState = createPartializedState(useStore.getState());

  const blob = new Blob([JSON.stringify(partializedState)], {
    type: 'application/json',
  });
  const file = new File([blob], 'chatty-buddy.json', {
    type: 'application/json',
  });

  return file;
};
