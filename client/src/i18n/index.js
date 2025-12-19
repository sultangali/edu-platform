import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import kaz from './locales/kaz.json';
import rus from './locales/rus.json';
import eng from './locales/eng.json';

const resources = {
  kaz: { translation: kaz },
  rus: { translation: rus },
  eng: { translation: eng }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'kaz',
    defaultNS: 'translation',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    },
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;

