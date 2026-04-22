import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import sv from './locales/sv.json';

const savedLang = localStorage.getItem('myevents_lang');
const defaultLang = (savedLang === 'en' || savedLang === 'sv') ? savedLang : 'sv';

i18n
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, sv: { translation: sv } },
    lng: defaultLang,
    fallbackLng: 'sv',
    supportedLngs: ['en', 'sv'],
    interpolation: { escapeValue: false },
  });

export default i18n;
