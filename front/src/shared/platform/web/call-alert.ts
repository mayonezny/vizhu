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
 * Плюс системное уведомление, когда вкладка не на виду: свёрнутое окно
 * браузера иначе даёт только звук без всякого контекста.
 *
 * Ограничение web: всё это живёт, только пока открыт браузер. Разбудить
 * закрытый браузер способен лишь настоящий push (service worker + FCM).
 */

const NOTIFICATION_TAG = 'vizhu-incoming-call';

const canNotify = (): boolean =>
  typeof Notification !== 'undefined' && Notification.permission === 'granted';

/**
 * Показываем только когда волонтёр не смотрит на вкладку: если она перед
 * глазами, оверлей звонка и так виден, дублировать его карточкой незачем.
 * hasFocus() ловит и другое окно поверх, и свёрнутый браузер.
 */
const shouldNotify = (): boolean => document.visibilityState === 'hidden' || !document.hasFocus();

type AudioCtor = typeof AudioContext;

export const createWebCallAlert = (haptics: HapticsPort): CallAlertPort => {
  let ctx: AudioContext | null = null;
  let loopTimer: ReturnType<typeof setInterval> | null = null;
  let notification: Notification | null = null;

  const showNotification = () => {
    if (notification || !shouldNotify()) {
      return;
    }
    if (!canNotify()) {
      console.warn(
        '[call] уведомление не показано: разрешение =',
        typeof Notification === 'undefined' ? 'API недоступен' : Notification.permission,
      );
      return;
    }
    try {
      notification = new Notification('Входящий вызов', {
        body: 'Незрячему нужна помощь',
        icon: '/assets/icons/icon-192.png',
        tag: NOTIFICATION_TAG,
        // Звонок ждёт ответа — карточка не должна исчезать сама.
        requireInteraction: true,
      });
      notification.onclick = () => {
        // Возвращаем волонтёра к вкладке: решение он принимает на оверлее.
        window.focus();
        notification?.close();
      };
    } catch {
      // некоторые браузеры запрещают конструктор вне service worker
    }
  };

  const closeNotification = () => {
    notification?.close();
    notification = null;
  };

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
      showNotification();
      if (loopTimer) {
        return;
      }
      playCycle();
      loopTimer = setInterval(playCycle, 2400);
    },

    stop: () => {
      closeNotification();
      if (loopTimer) {
        clearInterval(loopTimer);
        loopTimer = null;
      }
      haptics.stop();
    },
  };
};
