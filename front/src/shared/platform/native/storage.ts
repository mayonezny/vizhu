import { Preferences } from '@capacitor/preferences';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';

import type { SecureStoragePort, StateStoragePort } from '../types';

/**
 * Нативное хранилище состояния — @capacitor/preferences
 * (UserDefaults на iOS / SharedPreferences на Android): в отличие от
 * localStorage WebView не вычищается системой.
 */
export const nativeStateStorage: StateStoragePort = {
  getItem: async (name) => (await Preferences.get({ key: name })).value,
  setItem: async (name, value) => {
    await Preferences.set({ key: name, value });
  },
  removeItem: async (name) => {
    await Preferences.remove({ key: name });
  },
};

/**
 * Защищённое хранилище — Keychain (iOS) / EncryptedSharedPreferences (Android).
 * Здесь живёт refresh-токен: куки между capacitor://localhost и API-доменом
 * ненадёжны, поэтому нативный клиент получает токен в теле ответа.
 */
export const nativeSecureStorage: SecureStoragePort = {
  get: async (key) => {
    try {
      return (await SecureStoragePlugin.get({ key })).value;
    } catch {
      // плагин бросает, если ключа нет
      return null;
    }
  },
  set: async (key, value) => {
    await SecureStoragePlugin.set({ key, value });
  },
  remove: async (key) => {
    await SecureStoragePlugin.remove({ key }).catch(() => {});
  },
};
