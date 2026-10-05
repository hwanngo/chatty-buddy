import { v4 as uuidv4 } from 'uuid';
import {
  ChatInterface,
  ConfigInterface,
  FolderCollection,
  MessageInterface,
} from '@type/chat';
import { _defaultChatConfig, _defaultImageDetail } from '@constants/chat';

export const MAX_IMPORT_BYTES = 20 * 1024 * 1024;
const MAX_ITEMS = 10000;
const record = (value: unknown): value is Record<string, any> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const safeKey = (key: string) =>
  !['__proto__', 'constructor', 'prototype'].includes(key);

export function normalizeConfig(value: unknown): ConfigInterface {
  if (value !== undefined && !record(value))
    throw new Error('Invalid chat configuration.');
  const result = { ..._defaultChatConfig, ...value } as ConfigInterface;
  if (typeof result.model !== 'string' || !result.model.trim())
    throw new Error('Invalid model ID.');
  const ranges: [keyof ConfigInterface, number, number][] = [
    ['temperature', 0, 2],
    ['top_p', 0, 1],
    ['presence_penalty', -2, 2],
    ['frequency_penalty', -2, 2],
    ['max_tokens', 1, 10000000],
  ];
  for (const [key, min, max] of ranges) {
    const n = result[key];
    if (typeof n !== 'number' || !Number.isFinite(n) || n < min || n > max) {
      throw new Error(`Invalid configuration field: ${key}.`);
    }
  }
  for (const key of ['webSearch', 'fetchUrl', 'think'] as const) {
    if (result[key] !== undefined && typeof result[key] !== 'boolean')
      throw new Error(`Invalid ${key}.`);
  }
  if (
    result.reasoningEffort != null &&
    !['none', 'low', 'medium', 'high'].includes(result.reasoningEffort)
  ) {
    throw new Error('Invalid reasoning setting.');
  }
  const output = (result as ConfigInterface & { output_tokens?: number })
    .output_tokens;
  if (
    output !== undefined &&
    (!Number.isInteger(output) || output < 1 || output > 1000000)
  )
    throw new Error('Invalid output token limit.');
  return result;
}

function normalizeMessages(value: unknown): MessageInterface[] {
  if (!Array.isArray(value) || value.length > MAX_ITEMS)
    throw new Error('Invalid or oversized message list.');
  const ids = new Set<string>();
  return value.map((item) => {
    if (
      !record(item) ||
      !['user', 'assistant', 'system', 'tool'].includes(item.role)
    )
      throw new Error('Invalid message role.');
    const content =
      typeof item.content === 'string'
        ? [{ type: 'text', text: item.content }]
        : item.content;
    if (!Array.isArray(content) || content.length > 100)
      throw new Error('Invalid message content.');
    const normalized = content.map((block) => {
      if (!record(block)) throw new Error('Invalid content block.');
      if (block.type === 'text' && typeof block.text === 'string')
        return { type: 'text', text: block.text };
      if (
        block.type === 'image_url' &&
        record(block.image_url) &&
        typeof block.image_url.url === 'string'
      ) {
        const { url, detail = 'auto' } = block.image_url;
        if (
          !/^(https?:\/\/|data:image\/(png|jpeg|jpg|webp|gif);base64,)/i.test(
            url
          ) ||
          !['low', 'high', 'auto'].includes(detail)
        ) {
          throw new Error('Invalid image content.');
        }
        return { type: 'image_url', image_url: { url, detail } };
      }
      throw new Error('Unsupported message content block.');
    });
    if (!normalized.length && !item.tool_calls?.length)
      throw new Error('Message content must contain a text or image block.');
    if (!normalized.length) normalized.push({ type: 'text', text: '' });
    let id = typeof item.id === 'string' && item.id ? item.id : uuidv4();
    if (ids.has(id)) id = uuidv4();
    ids.add(id);
    const message: MessageInterface = {
      id,
      role: item.role,
      content: normalized as MessageInterface['content'],
    };
    if (item.tool_calls !== undefined) {
      if (
        item.role !== 'assistant' ||
        !Array.isArray(item.tool_calls) ||
        item.tool_calls.length > 100
      )
        throw new Error('Invalid tool calls.');
      message.tool_calls = item.tool_calls.map((call: unknown) => {
        if (
          !record(call) ||
          typeof call.id !== 'string' ||
          call.type !== 'function' ||
          !record(call.function) ||
          typeof call.function.name !== 'string' ||
          typeof call.function.arguments !== 'string'
        )
          throw new Error('Invalid tool call.');
        return {
          id: call.id,
          type: 'function',
          function: {
            name: call.function.name,
            arguments: call.function.arguments,
          },
        };
      });
    }
    if (item.role === 'tool') {
      if (typeof item.tool_call_id !== 'string' || !item.tool_call_id)
        throw new Error('Tool result is missing its call ID.');
      message.tool_call_id = item.tool_call_id;
      if (typeof item.tool_name === 'string')
        message.tool_name = item.tool_name;
    }
    if (
      ['streaming', 'complete', 'failed', 'cancelled'].includes(
        item.generationStatus
      )
    ) {
      message.generationStatus =
        item.generationStatus === 'streaming'
          ? 'cancelled'
          : item.generationStatus;
      if (typeof item.generationError === 'string')
        message.generationError = item.generationError;
    }
    return message;
  });
}

export function normalizeChats(value: unknown): ChatInterface[] {
  if (!Array.isArray(value) || value.length > MAX_ITEMS)
    throw new Error('Invalid or oversized chat list.');
  const ids = new Set<string>();
  return value.map((item) => {
    if (!record(item) || typeof item.title !== 'string' || !item.title.trim())
      throw new Error('Invalid chat title.');
    if (item.titleSet !== undefined && typeof item.titleSet !== 'boolean')
      throw new Error('Invalid title setting.');
    if (
      item.folder !== undefined &&
      (typeof item.folder !== 'string' || !safeKey(item.folder))
    )
      throw new Error('Invalid folder ID.');
    let id = typeof item.id === 'string' && item.id ? item.id : uuidv4();
    if (ids.has(id)) id = uuidv4();
    ids.add(id);
    if (
      item.imageDetail !== undefined &&
      !['low', 'high', 'auto'].includes(item.imageDetail)
    )
      throw new Error('Invalid image detail.');
    return {
      id,
      title: item.title,
      titleSet: item.titleSet ?? false,
      imageDetail: item.imageDetail ?? _defaultImageDetail,
      ...(item.folder ? { folder: item.folder } : {}),
      config: normalizeConfig(item.config),
      messages: normalizeMessages(item.messages),
    };
  });
}

export function normalizeFolders(value: unknown): FolderCollection {
  if (!record(value) || Object.keys(value).length > MAX_ITEMS)
    throw new Error('Invalid folder collection.');
  const folders: FolderCollection = {};
  for (const [id, folder] of Object.entries(value)) {
    if (
      !safeKey(id) ||
      !record(folder) ||
      folder.id !== id ||
      typeof folder.name !== 'string' ||
      !Number.isFinite(folder.order) ||
      typeof folder.expanded !== 'boolean'
    )
      throw new Error('Invalid folder.');
    folders[id] = {
      id,
      name: folder.name,
      order: folder.order,
      expanded: folder.expanded,
      ...(typeof folder.color === 'string' ? { color: folder.color } : {}),
    };
  }
  return folders;
}

export const validateAndFixChats = (
  value: unknown
): value is ChatInterface[] => {
  try {
    const chats = normalizeChats(value);
    (value as ChatInterface[]).splice(0, (value as unknown[]).length, ...chats);
    return true;
  } catch {
    return false;
  }
};
export const validateFolders = (value: unknown): value is FolderCollection => {
  try {
    normalizeFolders(value);
    return true;
  } catch {
    return false;
  }
};
export const validateExportV1 = (value: unknown): boolean => {
  try {
    if (!record(value) || value.version !== 1) return false;
    const chats = normalizeChats(value.chats ?? []);
    const folders = normalizeFolders(value.folders);
    if (chats.some((chat) => chat.folder && !folders[chat.folder]))
      return false;
    value.chats = chats;
    value.folders = folders;
    return true;
  } catch {
    return false;
  }
};
export const isLegacyImport = Array.isArray;
const isOpenAIChat = (value: unknown): boolean =>
  record(value) && record(value.mapping);
export const isOpenAIContent = (value: unknown): boolean =>
  isOpenAIChat(value) ||
  (record(value) &&
    !value.id &&
    !value.config &&
    Array.isArray(value.messages)) ||
  (Array.isArray(value) && value.length > 0 && isOpenAIChat(value[0]));
export class PartialImportError extends Error {
  constructor(
    message: string,
    public result: ChatInterface
  ) {
    super(message);
    this.name = 'PartialImportError';
  }
}

export function convertOpenAIToChattyBuddyFormat(
  value: unknown,
  allowPartial = false
): ChatInterface {
  if (!record(value)) throw new Error('Invalid OpenAI export.');
  const rawMessages: unknown[] = [];
  let skipped = 0;
  if (isOpenAIChat(value)) {
    const mapping = value.mapping;
    const keys = Object.keys(mapping);
    if (!keys.length || keys.length > MAX_ITEMS)
      throw new Error('Invalid or oversized conversation graph.');
    let end =
      typeof value.current_node === 'string' && mapping[value.current_node]
        ? value.current_node
        : '';
    if (!end) {
      // Iterative traversal avoids stack exhaustion; validate both edge directions.
      const roots = keys.filter((key) => !mapping[key]?.parent);
      if (!roots.length)
        throw new Error('Conversation graph contains a cycle.');
      const stack: [string, number][] = roots.map((key) => [key, 0]);
      const visited = new Set<string>();
      let depth = -1;
      while (stack.length) {
        const [key, level] = stack.pop()!;
        if (visited.has(key))
          throw new Error(
            'Conversation graph contains repeated edges or a cycle.'
          );
        visited.add(key);
        const node = mapping[key];
        if (!record(node) || !Array.isArray(node.children))
          throw new Error('Invalid conversation graph node.');
        if (level > depth) {
          depth = level;
          end = key;
        }
        for (const child of node.children) {
          if (typeof child !== 'string' || !mapping[child])
            throw new Error('Missing conversation graph node.');
          stack.push([child, level + 1]);
        }
      }
    }
    const ancestors = new Set<string>();
    while (end) {
      if (ancestors.has(end) || ancestors.size >= MAX_ITEMS)
        throw new Error('Conversation graph contains a parent cycle.');
      ancestors.add(end);
      const node = mapping[end];
      if (!record(node)) throw new Error('Missing conversation parent.');
      if (node.message) {
        const message = node.message;
        const content = message.content;
        if (
          record(content) &&
          Array.isArray(content.parts) &&
          content.parts.every((part: unknown) => typeof part === 'string')
        ) {
          rawMessages.push({
            role: message.author?.role,
            content: content.parts.join(''),
          });
        } else if (
          record(content) &&
          ['text', 'image_url'].includes(content.type)
        ) {
          rawMessages.push({ role: message.author?.role, content: [content] });
        } else skipped++;
      }
      if (node.parent != null && typeof node.parent !== 'string')
        throw new Error('Invalid conversation parent.');
      end = node.parent ?? '';
    }
    rawMessages.reverse();
  } else if (Array.isArray(value.messages)) {
    rawMessages.push(...value.messages);
  } else throw new Error('Unrecognized OpenAI export.');
  const configFields = Object.fromEntries(
    Object.keys(_defaultChatConfig)
      .filter((key) => value[key] !== undefined)
      .map((key) => [key, value[key]])
  );
  const chat = normalizeChats([
    {
      id: uuidv4(),
      title: value.title || 'Imported chat',
      titleSet: true,
      config: configFields,
      messages: rawMessages,
    },
  ])[0];
  if (!chat.messages.length)
    throw new Error('No supported messages were found.');
  if (skipped && !allowPartial)
    throw new PartialImportError(
      `${skipped} unsupported messages would be skipped.`,
      chat
    );
  return chat;
}
export const convertOpenAIToChattyBuddyFormatPartialOK = (value: unknown) =>
  convertOpenAIToChattyBuddyFormat(value, true);
export const convertOpenAIToChattyBuddyFormatPartialNTY = (value: unknown) =>
  convertOpenAIToChattyBuddyFormat(value, false);
export const importOpenAIChatExport = (value: unknown, partial = false) =>
  (Array.isArray(value) ? value : [value]).map((chat) =>
    convertOpenAIToChattyBuddyFormat(chat, partial)
  );

export const createChatExport = (
  chats: ChatInterface[] = [],
  folders: FolderCollection = {}
) => ({
  version: 1,
  chats,
  folders: Object.fromEntries(
    Object.entries(folders).filter(([id]) =>
      chats.some((chat) => chat.folder === id)
    )
  ),
});

export function parseChatImport(value: unknown): {
  chats: ChatInterface[];
  folders: FolderCollection;
} {
  if (record(value) && value.version === 1) {
    if (!validateExportV1(value))
      throw new Error('Invalid version 1 chat backup.');
    return { chats: value.chats, folders: value.folders };
  }
  if (isOpenAIContent(value))
    return { chats: importOpenAIChatExport(value), folders: {} };
  const chats = normalizeChats(Array.isArray(value) ? value : [value]);
  const folders: FolderCollection = {};
  // Legacy folder fields were names. Give them new identifiers instead of
  // trusting them as references into the current user's folder collection.
  const byName = new Map<string, string>();
  for (const chat of chats) {
    if (!chat.folder) continue;
    const name = chat.folder;
    const id = byName.get(name) ?? uuidv4();
    byName.set(name, id);
    folders[id] = { id, name, order: byName.size - 1, expanded: false };
    chat.folder = id;
  }
  return { chats, folders };
}

export function mergeChatImport(
  current: { chats?: ChatInterface[]; folders: FolderCollection },
  imported: ReturnType<typeof parseChatImport>
) {
  const folderIds = new Map(
    Object.keys(imported.folders).map((id) => [id, uuidv4()])
  );
  const folders = { ...current.folders };
  for (const [id, folder] of Object.entries(imported.folders)) {
    const nextId = folderIds.get(id)!;
    folders[nextId] = {
      ...folder,
      id: nextId,
      order: Object.keys(folders).length,
    };
  }
  const chats = imported.chats.map((chat) => ({
    ...chat,
    id: uuidv4(),
    ...(chat.folder ? { folder: folderIds.get(chat.folder) } : {}),
  }));
  return {
    chats: [...chats, ...(current.chats ?? [])],
    folders,
    currentChatIndex: chats.length ? 0 : -1,
  };
}
