import { registerPlatform } from '../index';
import { nativeHaptics } from './haptics';
import { nativePermissions } from './permissions';
import { nativePhotoCamera } from './photo-camera';
import { nativeSecureStorage, nativeStateStorage } from './storage';
import { createWebCallAlert } from '../web/call-alert';

/**
 * Регистрация нативных (Capacitor) реализаций платформенных портов.
 *
 * Импортируется ТОЛЬКО динамически из app/platform-init.ts при
 * isNativePlatform() — статический импорт затащил бы капаситор-плагины
 * в web-бандл.
 *
 * callAlert: пока переиспользуем WebAudio-рингтон (в WebView работает),
 * но с нативной вибрацией. Фоновые входящие (push + звук из фона /
 * CallKit) — отдельная задача.
 */
export const registerNativePlatform = (): void => {
  registerPlatform({
    permissions: nativePermissions,
    stateStorage: nativeStateStorage,
    secureStorage: nativeSecureStorage,
    photoCamera: nativePhotoCamera,
    haptics: nativeHaptics,
    callAlert: createWebCallAlert(nativeHaptics),
  });
};
