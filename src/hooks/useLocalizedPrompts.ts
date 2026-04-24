import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '@store/store';
import { getPromptsByLang } from '@constants/prompt';
import enPrompts from '@constants/prompts.en.json';
import viPrompts from '@constants/prompts.vi.json';

const DEFAULT_IDS = new Set([
  ...enPrompts.map((p) => p.id),
  ...viPrompts.map((p) => p.id),
]);

// Returns true if the user has not added any custom prompts
function isUsingDefaults(prompts: { id: string }[]): boolean {
  return prompts.every((p) => DEFAULT_IDS.has(p.id));
}

export default function useLocalizedPrompts() {
  const { i18n } = useTranslation();
  const prompts = useStore((state) => state.prompts);
  const setPrompts = useStore((state) => state.setPrompts);

  useEffect(() => {
    if (isUsingDefaults(prompts)) {
      setPrompts(getPromptsByLang(i18n.language));
    }
  }, [i18n.language]);
}
