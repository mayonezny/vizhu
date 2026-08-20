import type { PermissionKind, PermissionsPort, PlatformPermissionState } from '../types';

/**
 * Web-реализация разрешений: Permissions API для чтения состояния,
 * getUserMedia/geolocation/Notification — для запроса.
 */

const check = async (kind: PermissionKind): Promise<PlatformPermissionState> => {
  try {
    if (kind === 'notifications') {
      if (!('Notification' in window)) {
        return 'unsupported';
      }
      return Notification.permission === 'default' ? 'prompt' : Notification.permission;
    }

    if (!navigator.permissions?.query) {
      return 'prompt';
    }

    const status = await navigator.permissions.query({ name: kind as PermissionName });
    return status.state as PlatformPermissionState;
  } catch {
    // Часть браузеров не знает имя 'camera'/'microphone' — считаем, что можно запросить
    return 'prompt';
  }
};

/** Единичный запрос. Отказ глотаем — итоговое состояние вернёт check(). */
const requestOne = async (kind: PermissionKind): Promise<void> => {
  try {
    if (kind === 'camera' || kind === 'microphone') {
      const stream = await navigator.mediaDevices.getUserMedia(
        kind === 'camera' ? { video: true } : { audio: true },
      );
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    if (kind === 'geolocation') {
      await new Promise<void>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve(),
          () => resolve(),
        );
      });
      return;
    }

    if (kind === 'notifications' && 'Notification' in window) {
      await Notification.requestPermission();
    }
  } catch {
    // отказ или недоступность — состояние перечитается через check()
  }
};

export const webPermissions: PermissionsPort = {
  check,

  request: async (kind) => {
    await requestOne(kind);
    return check(kind);
  },

  requestMany: async (kinds) => {
    const requests: Promise<unknown>[] = [];
    const wantsCamera = kinds.includes('camera');
    const wantsMic = kinds.includes('microphone');

    // Камера и микрофон одним getUserMedia — один системный промпт вместо двух.
    if (wantsCamera || wantsMic) {
      requests.push(
        navigator.mediaDevices
          .getUserMedia({ video: wantsCamera, audio: wantsMic })
          .then((stream) => stream.getTracks().forEach((t) => t.stop()))
          .catch(() => null),
      );
    }
    if (kinds.includes('geolocation')) {
      requests.push(requestOne('geolocation'));
    }
    if (kinds.includes('notifications')) {
      requests.push(requestOne('notifications'));
    }

    await Promise.allSettled(requests);
  },
};
