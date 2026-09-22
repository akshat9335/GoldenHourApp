import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import en from '../locales/en.json';
import hi from '../locales/hi.json';

/**
 * i18n initialization for Golden Hour.
 * Supports English (en) and Hindi (hi).
 * Falls back to English for any missing keys.
 * Language can be changed at runtime via i18n.changeLanguage('hi').
 */
const resources = {
  en: { translation: en },
  hi: { translation: hi },
};

// Detect device locale — prefer Hindi for Indian locales
const deviceLocales = Localization.getLocales();
const deviceLang = deviceLocales[0]?.languageCode ?? 'en';
const supportedLang = ['en', 'hi'].includes(deviceLang) ? deviceLang : 'en';

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: supportedLang,
      fallbackLng: 'en',
      compatibilityJSON: 'v4',
      interpolation: {
        escapeValue: false, // React already escapes
      },
    });
}

export default i18n;
