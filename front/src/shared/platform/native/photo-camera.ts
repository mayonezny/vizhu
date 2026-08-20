import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { CameraPreview } from '@capgo/camera-preview';

import type { CapturedPhoto, PhotoCameraPort } from '../types';

/**
 * Нативная фото-камера — @capgo/camera-preview в режиме toBack:
 * превью рисуется ПОЗАДИ WebView, наш React-UI (кнопки, озвучка) остаётся
 * сверху. Пока превью активно, на body висит класс `camera-preview-active` —
 * CSS делает фон страницы прозрачным (см. app/index.css).
 *
 * Галерея — системный пикер через @capacitor/camera (Photo Picker,
 * без разрешения на всю медиатеку).
 */

/** Класс прозрачности — согласован с app/index.css и DialogPage.scss. */
export const CAMERA_PREVIEW_ACTIVE_CLASS = 'camera-preview-active';

const base64ToFile = (base64: string, mime = 'image/jpeg'): File => {
  const bytes = atob(base64);
  const buf = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) {
    buf[i] = bytes.charCodeAt(i);
  }
  return new File([buf], 'photo.jpg', { type: mime });
};

let previewActive = false;

const setTransparent = (on: boolean) => {
  document.body.classList.toggle(CAMERA_PREVIEW_ACTIVE_CLASS, on);
};

export const nativePhotoCamera: PhotoCameraPort = {
  mode: 'native-preview',

  startPreview: async () => {
    if (previewActive) {
      return;
    }
    setTransparent(true);
    try {
      await CameraPreview.start({
        position: 'rear',
        toBack: true,
        disableAudio: true,
      });
      previewActive = true;
    } catch (error) {
      setTransparent(false);
      throw error;
    }
  },

  stopPreview: async () => {
    if (!previewActive) {
      return;
    }
    previewActive = false;
    setTransparent(false);
    await CameraPreview.stop().catch(() => {});
  },

  capture: async () => {
    if (!previewActive) {
      return null;
    }
    const { value } = await CameraPreview.capture({
      quality: 90,
      // максимум качества снимка — скорость тут не критична
      photoQualityPrioritization: 'quality',
    });
    return { file: base64ToFile(value) };
  },

  pickFromGallery: async (): Promise<CapturedPhoto | null> => {
    try {
      const photo = await Camera.getPhoto({
        source: CameraSource.Photos,
        resultType: CameraResultType.Uri,
        quality: 90,
      });
      if (!photo.webPath) {
        return null;
      }
      const blob = await fetch(photo.webPath).then((r) => r.blob());
      return {
        file: new File([blob], 'photo.jpg', { type: blob.type || 'image/jpeg' }),
      };
    } catch {
      // пользователь закрыл пикер
      return null;
    }
  },
};
