import type ru from './locales/ru.json';

/**
 * Расширение типов i18next — добавляет автодополнение и проверку ключей перевода.
 *
 * После этого:
 * - t('demo.counter.heading')     → ✅ OK
 * - t('demo.counter.nonExistent') → ❌ ошибка TypeScript
 * - IDE предлагает все доступные ключи через Ctrl+Space
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof ru;
    };
  }
}
