/**
 * Рингтон + вибрация для входящего звонка волонтёра.
 *
 * - Звук генерируется WebAudio (без ассета): короткий двойной «дзинь» каждые 2.4с.
 * - Автоплей без жеста заблокирован, поэтому AudioContext «разогревается» в момент
 *   нажатия «Встать на линию» (primeAudio) — жест пользователя разблокирует звук,
 *   и последующий звонок уже звучит.
 * - Вибрация — navigator.vibrate (Android/Chrome; в iOS Safari не поддерживается).
 */

type AudioCtor = typeof AudioContext;

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

/** Разблокировать аудио на пользовательском жесте (нажатие «встать на линию»). */
export const primeAudio = (): void => {
  const audio = getCtx();
  if (audio && audio.state === 'suspended') {
    void audio.resume();
  }
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
  if ('vibrate' in navigator) {
    navigator.vibrate([300, 150, 300]);
  }
};

/** Начать звонить (звук + вибрация по кругу). Идемпотентно. */
export const startRinging = (): void => {
  if (loopTimer) {
    return;
  }
  playCycle();
  loopTimer = setInterval(playCycle, 2400);
};

/** Остановить звонок. */
export const stopRinging = (): void => {
  if (loopTimer) {
    clearInterval(loopTimer);
    loopTimer = null;
  }
  if ('vibrate' in navigator) {
    navigator.vibrate(0);
  }
};
