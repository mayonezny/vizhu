import { registerPlatform } from '../index';
import { createNativeCallAlert } from './call-alert';
import { nativeHaptics } from './haptics';
import { nativePermissions } from './permissions';
import { nativePhotoCamera } from './photo-camera';
import { nativeSecureStorage, nativeStateStorage } from './storage';

/**
 * Регистрация нативных (Capacitor) реализаций платформенных портов.
 *
 * Импортируется ТОЛЬКО динамически из app/platform-init.ts при
 * isNativePlatform() — статический импорт затащил бы капаситор-плагины
 * в web-бандл.
 *
 * callAlert: WebAudio-рингтон с нативной вибрацией плюс системное
 * уведомление о входящем. Пробуждение из выгруженного состояния (push /
 * CallKit) — отдельная задача.
 */
export const registerNativePlatform = (): void => {
  registerPlatform({
    permissions: nativePermissions,
    stateStorage: nativeStateStorage,
    secureStorage: nativeSecureStorage,
    photoCamera: nativePhotoCamera,
    haptics: nativeHaptics,
    callAlert: createNativeCallAlert(nativeHaptics),
  });
};
