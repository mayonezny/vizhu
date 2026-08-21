import { LocalNotifications } from '@capacitor/local-notifications';

import type { CallAlertPort, HapticsPort } from '../types';
import { createWebCallAlert } from '../web/call-alert';

/**
 * Нативное оповещение о входящем звонке: звук и вибрация как в вебе плюс
 * системное уведомление, чтобы волонтёр понял, что происходит, когда
 * приложение свёрнуто.
 *
 * Граница возможностей: уведомление показывает сам процесс приложения, а не
 * облако, поэтому оно доедет, только пока жив JS. На Android это несколько
 * минут после сворачивания (дальше вмешивается Doze), на iOS — считанные
 * секунды. Дальше сокет всё равно отваливается и звонок волонтёру не
 * назначается, так что дыры в сценарии это не создаёт. Полноценное
 * пробуждение из выгруженного состояния — только push (FCM/APNs).
 */

/** Фиксированный id: повторный показ заменяет карточку, а не плодит новые. */
const INCOMING_NOTIFICATION_ID = 1;
const CHANNEL_ID = 'incoming-calls';

let channelReady = false;

/** Канал с максимальной важностью — иначе Android покажет карточку молча в шторке. */
const ensureChannel = async (): Promise<void> => {
  if (channelReady) {
    return;
  }
  channelReady = true;
  await LocalNotifications.createChannel({
    id: CHANNEL_ID,
    name: 'Входящие звонки',
    description: 'Уведомления о вызовах от незрячих',
    importance: 5,
    visibility: 1,
    vibration: true,
  }).catch(() => {
    // на iOS каналов нет — вызов просто игнорируется
  });
};

const showIncoming = async (): Promise<void> => {
  const { display } = await LocalNotifications.checkPermissions();
  if (display !== 'granted') {
    // Разрешение спрашиваем при выходе на линию и в профиле, а не в момент
    // звонка: системный диалог поверх входящего только собьёт с толку.
    console.warn('[call] уведомление не показано: разрешение =', display);
    return;
  }
  await ensureChannel();
  await LocalNotifications.schedule({
    notifications: [
      {
        id: INCOMING_NOTIFICATION_ID,
        channelId: CHANNEL_ID,
        title: 'Входящий вызов',
        body: 'Незрячему нужна помощь',
        // Карточку намеренно оставляем смахиваемой. С `ongoing: true` её
        // нельзя убрать руками, и если процесс приложения умрёт до отбоя
        // (а в фоне это обычное дело), она зависнет навсегда — снять её
        // будет уже нечем.
        autoCancel: true,
      },
    ],
  });
};

const hideIncoming = async (): Promise<void> => {
  await LocalNotifications.cancel({
    notifications: [{ id: INCOMING_NOTIFICATION_ID }],
  }).catch(() => {});
};

export const createNativeCallAlert = (haptics: HapticsPort): CallAlertPort => {
  const base = createWebCallAlert(haptics);

  return {
    prime: base.prime,
    start: () => {
      base.start();
      void showIncoming();
    },
    stop: () => {
      base.stop();
      void hideIncoming();
    },
  };
};
