import { listDriveFiles } from '@api/google-api';
import useStore from '@store/store';
import { cloudBackupFile } from '@store/storage/cloudBackup';
export const getFiles = async (accessToken: string, signal?: AbortSignal) =>
  (await listDriveFiles(accessToken, signal)).files;
export const stateToFile = () => cloudBackupFile(useStore.getState());
