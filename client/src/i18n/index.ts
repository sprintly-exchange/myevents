import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import sv from './locales/sv.json';
import si from './locales/si.json';

// Use a versioned key — old 'myevents_lang' was auto-set by LanguageDetector
// and may have picked up English. Only explicit user toggles write to this key.
const LANG_KEY = 'myevents_lang_v2';
const saved = localStorage.getItem(LANG_KEY);
const defaultLang: string = (saved === 'en' || saved === 'sv' || saved === 'si') ? saved : 'sv';

i18n
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, sv: { translation: sv }, si: { translation: si } },
    lng: defaultLang,
    fallbackLng: 'sv',
    supportedLngs: ['en', 'sv', 'si'],
    interpolation: { escapeValue: false },
  });

export const LANG_STORAGE_KEY = LANG_KEY;
export default i18n;
