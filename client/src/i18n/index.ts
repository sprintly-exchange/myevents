import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import sv from './locales/sv.json';
import si from './locales/si.json';
import el from './locales/el.json';

// To add a new language:
//   1. Import its locale JSON above
//   2. Add it to `locales` below (code → translations)
//   3. Add its flag emoji to FLAGS below
// Everything else (selectors, cycle, types) derives from these two objects.
const locales = { sv, en, si, el } as const;

export const SUPPORTED_LANGUAGES = Object.keys(locales) as (keyof typeof locales)[];
export type SupportedLanguage = keyof typeof locales;

export const LANGUAGE_FLAGS: Record<SupportedLanguage, string> = {
  sv: '🇸🇪',
  en: '🇬🇧',
  si: '🇱🇰',
  el: '🇬🇷',
};

// Use a versioned key — old 'myevents_lang' was auto-set by LanguageDetector
// and may have picked up English. Only explicit user toggles write to this key.
const LANG_KEY = 'myevents_lang_v2';
const saved = localStorage.getItem(LANG_KEY) as SupportedLanguage | null;
const defaultLang: SupportedLanguage =
  saved && (SUPPORTED_LANGUAGES as string[]).includes(saved) ? saved : 'sv';

i18n
  .use(initReactI18next)
  .init({
    resources: Object.fromEntries(
      Object.entries(locales).map(([lang, translation]) => [lang, { translation }])
    ),
    lng: defaultLang,
    fallbackLng: 'sv',
    supportedLngs: SUPPORTED_LANGUAGES,
    interpolation: { escapeValue: false },
  });

export const LANG_STORAGE_KEY = LANG_KEY;
export default i18n;
