import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import vi from './locales/vi.json';
import en from './locales/en.json';

const LANGUAGE_KEY = 'APP_LANGUAGE';

const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lng: string) => void) => {
    try {
      const storedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (storedLanguage) {
        return callback(storedLanguage);
      }
      return callback('vi'); // Default to Vietnamese
    } catch (error) {
      console.log('Error reading language', error);
      return callback('vi');
    }
  },
  init: () => {},
  cacheUserLanguage: async (lng: string) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, lng);
    } catch (error) {
      console.log('Error saving language', error);
    }
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'vi',
    resources: {
      vi: { translation: vi },
      en: { translation: en },
    },
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
