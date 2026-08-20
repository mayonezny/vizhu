import type { SecureStoragePort, StateStoragePort } from '../types';

/**
 * Web-хранилище состояния — localStorage (синхронный, совместим со
 * StateStorage из zustand). Натив заменит на @capacitor/preferences.
 */
export const webStateStorage: StateStoragePort = {
  getItem: (name) => localStorage.getItem(name),
  setItem: (name, value) => {
    localStorage.setItem(name, value);
  },
  removeItem: (name) => {
    localStorage.removeItem(name);
  },
};

/**
 * Web-«защищённое» хранилище — только память процесса, НЕ переживает reload.
 *
 * Это осознанно: в браузере секреты не должны попадать в localStorage (XSS),
 * refresh-токен живёт в httpOnly-куке и хранить его на клиенте не нужно.
 * Нативная реализация заменит это на Keychain / EncryptedSharedPreferences.
 */
const memory = new Map<string, string>();

export const webSecureStorage: SecureStoragePort = {
  get: (key) => Promise.resolve(memory.get(key) ?? null),
  set: (key, value) => {
    memory.set(key, value);
    return Promise.resolve();
  },
  remove: (key) => {
    memory.delete(key);
    return Promise.resolve();
  },
};
