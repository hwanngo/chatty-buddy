import { ModelOptions } from '@utils/modelReader';
import { Prompt } from './prompt';
import { Theme } from './theme';

// The types in this file must mimick the structure of the the API request

export type Content = 'text' | 'image_url';
export type ImageDetail = 'low' | 'high' | 'auto';
const imageDetails: ImageDetail[] = ['low', 'high', 'auto'];
// `tool` carries the result of a client-executed tool call back to the model.
// It is deliberately absent from `roles` below: that array drives the role
// picker, and a tool result is produced by the app, never authored by hand.
export type Role = 'user' | 'assistant' | 'system' | 'tool';
export const roles: Role[] = ['user', 'assistant', 'system'];

export interface ImageContentInterface extends ContentInterface {
  type: 'image_url';
  image_url: {
    url: string; // base64 or image URL
    detail: ImageDetail;
  };
}

export interface TextContentInterface extends ContentInterface {
  type: 'text';
  text: string;
}

export function strToTextContent(ob: string): TextContentInterface {
  return {
    type: 'text',
    text: ob,
  };
}

export function isTextContent(
  ob: ContentInterface | undefined
): ob is TextContentInterface {
  return (
    ob !== undefined &&
    ob !== null &&
    (ob as TextContentInterface).text !== undefined
  );
}

export function isImageContent(
  ob: ContentInterface | undefined
): ob is ImageContentInterface {
  return (
    ob !== undefined &&
    ob !== null &&
    (ob as ImageContentInterface).image_url !== undefined
  );
}

export interface ContentInterface {
  [x: string]: any;
  type: Content;
}

/** A function call the model asked the client to perform. */
export interface ToolCallInterface {
  id: string;
  type: 'function';
  function: {
    name: string;
    /** JSON, as a string — the model streams it in fragments. */
    arguments: string;
  };
}

export interface MessageInterface {
  role: Role;
  content: ContentInterface[];
  /** Set on an `assistant` message that requested one or more tool calls. */
  tool_calls?: ToolCallInterface[];
  /** Set on a `tool` message: which call this is the result of. */
  tool_call_id?: string;
  /** Set on a `tool` message: display label for the chip in the transcript. */
  tool_name?: string;
}

export interface ChatInterface {
  id: string;
  title: string;
  folder?: string;
  messages: MessageInterface[];
  config: ConfigInterface;
  titleSet: boolean;
  imageDetail: ImageDetail;
}

/**
 * `'none'` is a real value the server must see, not the absence of one.
 * Measured against llama-server: `reasoning_effort: 'none'` suppresses
 * reasoning, while `'low'` and an omitted field both leave it on — so
 * "off" has to be sent, and `null` (don't send) is a separate state.
 */
export type ReasoningEffort = 'none' | 'low' | 'medium' | 'high';

export interface ConfigInterface {
  model: ModelOptions;
  max_tokens: number;
  temperature: number;
  presence_penalty: number;
  top_p: number;
  frequency_penalty: number;
  webSearch?: boolean;
  reasoningEffort?: ReasoningEffort | null;
  /**
   * Let the model pull a web page into the conversation via the `fetch_url`
   * function tool. Off by default: it is the one feature that sends anything
   * to a third party (the reader service), so it must be opted into.
   *
   * Optional and falsy-by-default, which is why existing chats need no
   * migration — a chat saved before this field existed simply has it absent.
   */
  fetchUrl?: boolean;
  /**
   * Whether a thinking model may reason before answering. Only reaches the
   * model on the `ollama` protocol: its OpenAI-compatible shim ignores every
   * known way of asking, so the native `/api/chat` `think` parameter is the
   * only one that has any effect.
   *
   * Defaults to on, matching what a thinking model does unprompted, so
   * switching protocol doesn't silently change how the model behaves. Turning
   * it off trades the reasoning trace for a much faster first token.
   */
  think?: boolean;
}

export interface ChatHistoryInterface {
  title: string;
  index: number;
  id: string;
  chatSize?: number;
}

export interface ChatHistoryFolderInterface {
  [folderId: string]: ChatHistoryInterface[];
}

export interface FolderCollection {
  [folderId: string]: Folder;
}

export interface Folder {
  id: string;
  name: string;
  expanded: boolean;
  order: number;
  color?: string;
}

interface Pricing {
  price: number;
  unit: number;
}

interface CostDetails {
  prompt: Pricing;
  completion: Pricing;
  image: Pricing;
}

export interface ModelCost {
  [modelName: string]: CostDetails;
}

export type TotalTokenUsed = {
  [model in ModelOptions]?: {
    promptTokens: number;
    completionTokens: number;
    imageTokens: number;
  };
};
export interface LocalStorageInterfaceV0ToV1 {
  chats: ChatInterface[];
  currentChatIndex: number;
  apiKey: string;
  apiFree: boolean;
  apiFreeEndpoint: string;
  theme: Theme;
}

export interface LocalStorageInterfaceV1ToV2 {
  chats: ChatInterface[];
  currentChatIndex: number;
  apiKey: string;
  apiFree: boolean;
  apiFreeEndpoint: string;
  apiEndpoint?: string;
  theme: Theme;
}

export interface LocalStorageInterfaceV2ToV3 {
  chats: ChatInterface[];
  currentChatIndex: number;
  apiKey: string;
  apiFree: boolean;
  apiFreeEndpoint: string;
  apiEndpoint?: string;
  theme: Theme;
  autoTitle: boolean;
}
export interface LocalStorageInterfaceV3ToV4 {
  chats: ChatInterface[];
  currentChatIndex: number;
  apiKey: string;
  apiFree: boolean;
  apiFreeEndpoint: string;
  apiEndpoint?: string;
  theme: Theme;
  autoTitle: boolean;
  prompts: Prompt[];
}

export interface LocalStorageInterfaceV4ToV5 {
  chats: ChatInterface[];
  currentChatIndex: number;
  apiKey: string;
  apiFree: boolean;
  apiFreeEndpoint: string;
  apiEndpoint?: string;
  theme: Theme;
  autoTitle: boolean;
  prompts: Prompt[];
}

export interface LocalStorageInterfaceV5ToV6 {
  chats: ChatInterface[];
  currentChatIndex: number;
  apiKey: string;
  apiFree: boolean;
  apiFreeEndpoint: string;
  apiEndpoint?: string;
  theme: Theme;
  autoTitle: boolean;
  prompts: Prompt[];
}

export interface LocalStorageInterfaceV6ToV7 {
  chats: ChatInterface[];
  currentChatIndex: number;
  apiFree?: boolean;
  apiKey: string;
  apiEndpoint: string;
  theme: Theme;
  autoTitle: boolean;
  prompts: Prompt[];
  defaultChatConfig: ConfigInterface;
  defaultSystemMessage: string;
  hideMenuOptions: boolean;
  firstVisit: boolean;
  hideSideMenu: boolean;
}

export interface LocalStorageInterfaceV7oV8 extends LocalStorageInterfaceV6ToV7 {
  foldersName: string[];
  foldersExpanded: boolean[];
  folders: FolderCollection;
}
export interface LocalStorageInterfaceV8oV8_1 extends LocalStorageInterfaceV7oV8 {
  apiVersion: string;
}

export interface LocalStorageInterfaceV8_1ToV8_2 extends LocalStorageInterfaceV8oV8_1 {
  menuWidth: number;
  displayChatSize: boolean;
}

export interface LocalStorageInterfaceV8_2ToV9 extends LocalStorageInterfaceV8_1ToV8_2 {
  defaultImageDetail: ImageDetail;
}

export interface LocalStorageInterfaceV11ToV12 extends LocalStorageInterfaceV8_2ToV9 {
  defaultChatConfig: ConfigInterface;
}

export type { ModelOptions };
// export interface LocalStorageInterfaceV9ToV10
//   extends LocalStorageInterfaceV8_2ToV9 {
