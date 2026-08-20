import type { HapticsPort } from '../types';

/**
 * Web-вибрация — navigator.vibrate.
 * Работает на Android/Chrome; iOS Safari не поддерживает (тихий no-op).
 * Нативная реализация заменит на @capacitor/haptics (работает и на iOS).
 */
export const webHaptics: HapticsPort = {
  vibrate: (pattern) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  },
  stop: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
  },
};
