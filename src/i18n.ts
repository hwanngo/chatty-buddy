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
    fallbackLng: {
      en: ['en-US'],
      vi: ['vi-VN'],
      default: ['en-US'],
    },
    nonExplicitSupportedLngs: true,
    ns: namespace,
    defaultNS: 'main',
    react: { useSuspense: false },
  });

export default i18n;
