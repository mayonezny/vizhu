import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import ru from './locales/ru.json';

// ─── Ключ хранилища ───────────────────────────────────────────────────────────
const STORAGE_KEY = 'lang';

// ─── Определение языка ────────────────────────────────────────────────────────
// Приоритет: localStorage → язык браузера → русский по умолчанию
const saved = localStorage.getItem(STORAGE_KEY);
const browserLang = navigator.language.split('-')[0];
const supportedLangs = ['ru', 'en'];
const detectedLang = supportedLangs.includes(saved ?? '')
  ? saved!
  : supportedLangs.includes(browserLang)
    ? browserLang
    : 'ru';

// ─── Инициализация ────────────────────────────────────────────────────────────
void i18n.use(initReactI18next).init({
  resources: {
    ru: { translation: ru },
    en: { translation: en },
  },

  lng: detectedLang,
  fallbackLng: 'ru',

  interpolation: {
    // React сам экранирует строки — двойное экранирование не нужно
    escapeValue: false,
  },
});

/**
 * Сменить язык и сохранить выбор в localStorage.
 *
 * @example
 * ```ts
 * import { setLanguage } from '@/shared/lib/i18n';
 * setLanguage('en');
 * ```
 */
export const setLanguage = (lang: 'ru' | 'en') => {
  localStorage.setItem(STORAGE_KEY, lang);
  void i18n.changeLanguage(lang);
};

export default i18n;
