import { platform } from '@/shared/platform';

/**
 * Оповещение о входящем звонке — тонкая обёртка над platform.callAlert.
 * Реализация (WebAudio + вибрация) живёт в shared/platform/web/call-alert.ts;
 * на Capacitor подменится нативной без изменения этих экспортов.
 */

/** Разблокировать аудио на пользовательском жесте (нажатие «встать на линию»). */
export const primeAudio = (): void => platform.callAlert.prime();

/** Начать звонить (звук + вибрация по кругу). Идемпотентно. */
export const startRinging = (): void => platform.callAlert.start();

/** Остановить звонок. */
export const stopRinging = (): void => platform.callAlert.stop();
