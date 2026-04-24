import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || undefined;

const namespace = ['main', 'api', 'about', 'model', 'import', 'migration'];
if (googleClientId) namespace.push('drive');

export const initPromise = i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    backend: {
      loadPath: `${import.meta.env.BASE_URL}locales/{{lng}}/{{ns}}.json`,
    },
    // Only en-US / vi-VN folders exist. supportedLngs filters out unsupported
    // detected codes (so we never request /locales/en/*.json → 404), and
    // fallbackLng maps a detected generic code (en, vi) to its regional folder.
    // NOTE: do NOT add nonExplicitSupportedLngs here — combined with regional
    // supportedLngs it makes i18next reject en-US itself, emptying languages
    // and loading no namespaces (everything renders as raw keys).
    supportedLngs: ['en-US', 'vi-VN'],
    load: 'currentOnly',
    fallbackLng: {
      en: ['en-US'],
      vi: ['vi-VN'],
      default: ['en-US'],
    },
    ns: namespace,
    defaultNS: 'main',
    react: { useSuspense: false },
  });

export default i18n;
