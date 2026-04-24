import { Prompt } from '@type/prompt';
import enPrompts from './prompts.en.json';
import viPrompts from './prompts.vi.json';

const promptsByLang: Record<string, Prompt[]> = {
  en: enPrompts as Prompt[],
  vi: viPrompts as Prompt[],
};

export function getPromptsByLang(lang: string): Prompt[] {
  const key =
    Object.keys(promptsByLang).find((k) => lang.startsWith(k)) ?? 'en';
  return promptsByLang[key];
}

const browserLang =
  typeof navigator !== 'undefined' ? navigator.language : 'en';

const defaultPrompts: Prompt[] = getPromptsByLang(browserLang);

export default defaultPrompts;
