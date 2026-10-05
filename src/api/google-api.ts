import { v4 as uuidv4 } from 'uuid';
import { GoogleFileResource, GoogleFileList } from '@type/google-api';
import { createMultipartRelatedBody } from './helper';
import { MAX_IMPORT_BYTES } from '@utils/import';

export type DriveBackupFile = GoogleFileResource & {
  appProperties?: Record<string, string>;
  createdTime?: string;
};
const headers = (token: string) => ({ Authorization: `Bearer ${token}` });
const request = async (url: string, options: RequestInit) => {
  const signal = options.signal
    ? AbortSignal.any([options.signal, AbortSignal.timeout(30000)])
    : AbortSignal.timeout(30000);
  const response = await fetch(url, { ...options, signal });
  if (!response.ok)
    throw new Error(
      `Google Drive request failed (${response.status}). Your local data is unchanged; reconnect to retry.`
    );
  return response;
};

export const createDriveFile = async (
  file: File,
  accessToken: string,
  appProperties: Record<string, string> = {
    application: 'chatty-buddy',
    kind: 'root',
  },
  signal?: AbortSignal
): Promise<DriveBackupFile> => {
  const boundary = `chatty-buddy-${uuidv4()}`;
  const metadata = { name: file.name, mimeType: file.type, appProperties };
  const response = await request(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,appProperties,createdTime',
    {
      method: 'POST',
      headers: {
        ...headers(accessToken),
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: createMultipartRelatedBody(metadata, file, boundary),
      signal,
    }
  );
  const result = await response.json();
  if (typeof result.id !== 'string')
    throw new Error('Google Drive returned an invalid file ID.');
  return result;
};

export const getDriveFile = async <S = unknown>(
  fileId: string,
  accessToken: string,
  signal?: AbortSignal
): Promise<S> => {
  const response = await request(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
    {
      headers: headers(accessToken),
      signal,
    }
  );
  if (!response.body) throw new Error('Google Drive returned an empty backup.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_IMPORT_BYTES)
        throw new Error('The cloud backup exceeds the 20 MB import limit.');
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text) as S;
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
};

async function listFiles(
  accessToken: string,
  query: string,
  signal?: AbortSignal
): Promise<DriveBackupFile[]> {
  const files: DriveBackupFile[] = [];
  let pageToken = '';
  const seen = new Set<string>();
  do {
    const params = new URLSearchParams({
      q: query,
      orderBy: 'createdTime desc',
      pageSize: '1000',
      fields: 'nextPageToken,files(id,name,mimeType,appProperties,createdTime)',
      ...(pageToken ? { pageToken } : {}),
    });
    const response = await request(
      `https://www.googleapis.com/drive/v3/files?${params}`,
      { headers: headers(accessToken), signal }
    );
    const result = await response.json();
    if (!Array.isArray(result.files))
      throw new Error('Google Drive returned an invalid file list.');
    files.push(...result.files);
    pageToken = result.nextPageToken ?? '';
    if (pageToken && seen.has(pageToken))
      throw new Error('Google Drive pagination did not advance.');
    seen.add(pageToken);
    if (files.length > 100000)
      throw new Error(
        'Too many cloud snapshots. Archive old backups in Google Drive and reconnect.'
      );
  } while (pageToken);
  return files;
}
export const listDriveFiles = async (
  accessToken: string,
  signal?: AbortSignal
): Promise<GoogleFileList> => ({
  kind: 'drive#fileList',
  incompleteSearch: false,
  files: (
    await listFiles(
      accessToken,
      "trashed = false and mimeType = 'application/json'",
      signal
    )
  ).filter(
    (file) =>
      file.appProperties?.kind !== 'snapshot' &&
      (file.appProperties?.application === 'chatty-buddy' ||
        file.name === 'chatty-buddy.json')
  ),
});
export const listDriveSnapshots = async (
  group: string,
  accessToken: string,
  signal?: AbortSignal
) => {
  if (!/^[\w-]+$/.test(group)) throw new Error('Invalid backup group ID.');
  const files = await listFiles(
    accessToken,
    `trashed = false and appProperties has { key='backupGroup' and value='${group}' }`,
    signal
  );
  // Every device owns its own immutable history. Read its newest acknowledged
  // snapshot; conflicting histories are retained by the merge layer.
  const latest = new Map<string, DriveBackupFile>();
  for (const file of files) {
    const device = file.appProperties?.deviceId ?? file.id;
    if (!latest.has(device)) latest.set(device, file);
  }
  return [...latest.values()];
};
export const updateDriveFileName = async (
  fileName: string,
  fileId: string,
  accessToken: string
) => {
  const response = await request(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
    {
      method: 'PATCH',
      headers: { ...headers(accessToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: fileName,
        appProperties: { application: 'chatty-buddy', kind: 'root' },
      }),
    }
  );
  return response.json();
};
export const deleteDriveFile = async (fileId: string, accessToken: string) => {
  await request(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
    { method: 'DELETE', headers: headers(accessToken) }
  );
  return true;
};
export const validateGoogleOath2AccessToken = async (
  accessToken: string,
  signal?: AbortSignal
) => {
  await request('https://www.googleapis.com/drive/v3/about?fields=user', {
    headers: headers(accessToken),
    signal,
  });
  return true;
};
