import { Camera } from '@capacitor/camera';
import { LocalNotifications } from '@capacitor/local-notifications';

import type { PermissionKind, PermissionsPort, PlatformPermissionState } from '../types';
import { webPermissions } from '../web/permissions';

/**
 * Нативные разрешения.
 *
 * - camera — плагин Camera (покрывает и превью, и галерею).
 * - notifications — LocalNotifications (на Android 13+ дёргает POST_NOTIFICATIONS).
 * - microphone / geolocation — делегируем web-реализации: getUserMedia и
 *   navigator.geolocation в Capacitor WebView сами показывают системные
 *   диалоги (разрешения объявлены в манифесте/plist), отдельные плагины
 *   не нужны.
 */

const mapState = (state: string): PlatformPermissionState => {
  switch (state) {
    case 'granted':
      return 'granted';
    case 'denied':
      return 'denied';
    default:
      // 'prompt' | 'prompt-with-rationale' | 'limited'
      return 'prompt';
  }
};

const check = async (kind: PermissionKind): Promise<PlatformPermissionState> => {
  if (kind === 'camera') {
    const { camera } = await Camera.checkPermissions();
    return mapState(camera);
  }
  if (kind === 'notifications') {
    const { display } = await LocalNotifications.checkPermissions();
    return mapState(display);
  }
  return webPermissions.check(kind);
};

const request = async (kind: PermissionKind): Promise<PlatformPermissionState> => {
  if (kind === 'camera') {
    const { camera } = await Camera.requestPermissions({ permissions: ['camera'] });
    return mapState(camera);
  }
  if (kind === 'notifications') {
    const { display } = await LocalNotifications.requestPermissions();
    return mapState(display);
  }
  return webPermissions.request(kind);
};

export const nativePermissions: PermissionsPort = {
  check,
  request,
  requestMany: async (kinds) => {
    // Нативные диалоги показываются по одному — запрашиваем последовательно.
    for (const kind of kinds) {
      await request(kind);
    }
  },
};
