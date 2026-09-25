import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import hi from '../locales/hi.json';
import mr from '../locales/mr.json';

/**
 * i18n initialization for Golden Hour.
 * Supports English (en), Hindi (hi), and Marathi (mr).
 * Falls back to English for any missing keys.
 * Language can be changed at runtime via i18n.changeLanguage('hi').
 */
const resources = {
  en: { translation: en },
  hi: { translation: hi },
  mr: { translation: mr },
};

// Detect device locale cleanly across all platforms
let supportedLang = 'en';
try {
  if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || 'en';
    const langCode = locale.split('-')[0].toLowerCase();
    if (['en', 'hi', 'mr'].includes(langCode)) {
      supportedLang = langCode;
    }
  }
} catch {
  supportedLang = 'en';
}

import AsyncStorage from '@react-native-async-storage/async-storage';

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

  // Restore user's saved language preference if previously set
  AsyncStorage.getItem('@app_language')
    .then((saved) => {
      if (saved && (saved === 'en' || saved === 'hi' || saved === 'mr')) {
        i18n.changeLanguage(saved);
      }
    })
    .catch(() => {});
}

export default i18n;
