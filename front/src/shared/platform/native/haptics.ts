import { Haptics } from '@capacitor/haptics';

import type { HapticsPort } from '../types';

/**
 * Нативная вибрация — @capacitor/haptics (работает и на iOS, где
 * navigator.vibrate отсутствует).
 *
 * Плагин умеет только одиночный импульс заданной длительности, поэтому
 * паттерн [виброй, пауза, ...] раскладывается в цепочку таймеров.
 */
let chainTimers: ReturnType<typeof setTimeout>[] = [];

const clearChain = () => {
  chainTimers.forEach(clearTimeout);
  chainTimers = [];
};

export const nativeHaptics: HapticsPort = {
  vibrate: (pattern) => {
    clearChain();
    const steps = Array.isArray(pattern) ? pattern : [pattern];
    let offset = 0;
    steps.forEach((duration, i) => {
      const isPause = i % 2 === 1;
      if (!isPause) {
        const at = offset;
        chainTimers.push(
          setTimeout(() => {
            void Haptics.vibrate({ duration });
          }, at),
        );
      }
      offset += duration;
    });
  },
  stop: clearChain,
};
