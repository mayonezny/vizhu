import type { PlatformServices } from './types';
import { createWebCallAlert } from './web/call-alert';
import { webHaptics } from './web/haptics';
import { webPermissions } from './web/permissions';
import { webPhotoCamera } from './web/photo-camera';
import { webStateStorage, webSecureStorage } from './web/storage';

export { isNativePlatform, getPlatformName } from './detect';
export type {
  CallAlertPort,
  CapturedPhoto,
  HapticsPort,
  PermissionKind,
  PermissionsPort,
  PhotoCameraPort,
  PlatformPermissionState,
  PlatformServices,
  SecureStoragePort,
  StateStoragePort,
} from './types';

/**
 * Единая точка доступа к платформенным сервисам.
 *
 * По умолчанию — web-реализации. При переезде на Capacitor нативные
 * реализации подменяются через `registerPlatform` ДО первого использования
 * (см. README.md рядом — порядок инициализации важен для zustand persist).
 *
 * Потребители всегда обращаются через `platform.<port>` в момент вызова
 * (не деструктурируют порты в module scope) — тогда поздняя регистрация
 * нативных реализаций подхватывается автоматически.
 */
export const platform: PlatformServices = {
  permissions: webPermissions,
  stateStorage: webStateStorage,
  secureStorage: webSecureStorage,
  photoCamera: webPhotoCamera,
  haptics: webHaptics,
  callAlert: createWebCallAlert(webHaptics),
};

/** Подменить часть реализаций (вызывается нативным бутстрапом Capacitor). */
export const registerPlatform = (overrides: Partial<PlatformServices>): void => {
  Object.assign(platform, overrides);
};

/**
 * Storage-делегат для zustand persist: разыменовывает platform.stateStorage
 * при каждом обращении, а не при создании стора — поздняя регистрация
 * нативного хранилища не ломает ссылку.
 */
export const persistStateStorage = {
  getItem: (name: string) => platform.stateStorage.getItem(name),
  setItem: (name: string, value: string) => platform.stateStorage.setItem(name, value),
  removeItem: (name: string) => platform.stateStorage.removeItem(name),
};
