import type { CallAlertPort, HapticsPort } from '../types';

/**
 * Web-оповещение о входящем звонке: рингтон + вибрация.
 *
 * - Звук генерируется WebAudio (без ассета): короткий двойной «дзинь» каждые 2.4с.
 * - Автоплей без жеста заблокирован, поэтому AudioContext «разогревается» в момент
 *   нажатия «Встать на линию» (prime) — жест пользователя разблокирует звук,
 *   и последующий звонок уже звучит.
 * - Вибрация — через HapticsPort (web: navigator.vibrate, iOS Safari — no-op).
 *
 * Ограничение web: звонит только пока вкладка открыта. Нативная реализация
 * должна будить приложение из фона (push + локальное уведомление со звуком,
 * в идеале CallKit / ConnectionService).
 */

type AudioCtor = typeof AudioContext;

export const createWebCallAlert = (haptics: HapticsPort): CallAlertPort => {
  let ctx: AudioContext | null = null;
  let loopTimer: ReturnType<typeof setInterval> | null = null;

  const getCtx = (): AudioContext | null => {
    if (typeof window === 'undefined') {
      return null;
    }
    const Ctor: AudioCtor | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
    if (!Ctor) {
      return null;
    }
    ctx ??= new Ctor();
    return ctx;
  };

  const beep = (at: number, freq: number, duration: number): void => {
    const audio = getCtx();
    if (!audio) {
      return;
    }
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    // мягкая огибающая, чтобы не щёлкало
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.35, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(gain).connect(audio.destination);
    osc.start(at);
    osc.stop(at + duration + 0.02);
  };

  const playCycle = (): void => {
    const audio = getCtx();
    if (!audio) {
      return;
    }
    if (audio.state === 'suspended') {
      void audio.resume();
    }
    const now = audio.currentTime;
    beep(now, 880, 0.18);
    beep(now + 0.24, 988, 0.18);
    haptics.vibrate([300, 150, 300]);
  };

  return {
    prime: () => {
      const audio = getCtx();
      if (audio && audio.state === 'suspended') {
        void audio.resume();
      }
    },

    start: () => {
      if (loopTimer) {
        return;
      }
      playCycle();
      loopTimer = setInterval(playCycle, 2400);
    },

    stop: () => {
      if (loopTimer) {
        clearInterval(loopTimer);
        loopTimer = null;
      }
      haptics.stop();
    },
  };
};
