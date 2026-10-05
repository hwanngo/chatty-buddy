import type { StoreState } from '@store/store';
import { STORE_VERSION, migrate } from '@store/migrate';
import {
  normalizeChats,
  normalizeConfig,
  normalizeFolders,
} from '@utils/import';

export type CloudBackup = { version: number; state: Partial<StoreState> };
// Explicit cloud allowlist. Keys, endpoints, authentication configuration and
// runtime state are device-local and must never cross this boundary.
const cloudKeys = [
  'chats',
  'folders',
  'prompts',
  'defaultChatConfig',
  'defaultSystemMessage',
  'theme',
  'autoTitle',
  'titleModel',
  'advancedMode',
  'autoModel',
  'enterToSubmit',
  'inlineLatex',
  'markdownMode',
  'countTotalTokens',
  'totalTokenUsed',
  'displayChatSize',
  'defaultImageDetail',
  'autoScroll',
  'customModels',
] as const;
export function createCloudBackup(state: Partial<StoreState>): CloudBackup {
  return {
    version: STORE_VERSION,
    state: Object.fromEntries(
      cloudKeys
        .filter((key) => state[key] !== undefined)
        .map((key) => [key, state[key]])
    ),
  };
}
export const cloudBackupFile = (state: Partial<StoreState>) =>
  new File([JSON.stringify(createCloudBackup(state))], 'chatty-buddy.json', {
    type: 'application/json',
  });

export function parseCloudBackup(input: unknown): CloudBackup {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Invalid cloud backup.');
  const value = input as Record<string, unknown>;
  const version = value.version === undefined ? 0 : value.version;
  if (
    !Number.isInteger(version) ||
    (version as number) < 0 ||
    (version as number) > STORE_VERSION
  )
    throw new Error('Unsupported cloud backup version.');
  const raw = (value.state ?? value) as Record<string, unknown>;
  if (
    !raw ||
    typeof raw !== 'object' ||
    Array.isArray(raw) ||
    (!Array.isArray(raw.chats) && raw.chats !== undefined)
  )
    throw new Error('Invalid cloud backup state.');
  if (!('chats' in raw) && !('folders' in raw))
    throw new Error('This file is not a Chatty Buddy backup.');
  const migrated = migrate(structuredClone(raw), version as number);
  const chats = normalizeChats(migrated.chats ?? []);
  const folders = normalizeFolders(migrated.folders ?? {});
  if (chats.some((chat) => chat.folder && !folders[chat.folder]))
    throw new Error('Cloud backup references a missing folder.');
  // Only conversation data is restored automatically. Cloud settings remain
  // in the backup for portability, but cannot replace credentials or local
  // preferences merely by connecting to a shared file.
  if (migrated.defaultChatConfig !== undefined)
    normalizeConfig(migrated.defaultChatConfig);
  return { version: STORE_VERSION, state: { chats, folders } };
}
