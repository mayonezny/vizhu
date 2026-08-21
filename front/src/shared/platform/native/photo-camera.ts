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

/**
 * Очередь операций над камерой: start и stop никогда не выполняются
 * параллельно. Без неё быстрый уход со страницы ловил гонку — stop приходил,
 * пока start ещё в полёте, выходил по `previewActive === false` и оставлял
 * камеру включённой, а страницу прозрачной: превью «прилипало» под интерфейс
 * следующего экрана.
 */
let chain: Promise<unknown> = Promise.resolve();
const runExclusive = (task: () => Promise<void>): Promise<void> => {
  const next = chain.then(task, task);
  chain = next.catch(() => {});
  return next;
};

const setTransparent = (on: boolean) => {
  document.body.classList.toggle(CAMERA_PREVIEW_ACTIVE_CLASS, on);
};

/**
 * Габариты снимка. Заданные width/height переводят плагин в режим «ужать
 * до этих границ», вместо режима «обрезать под область превью» — иначе кадр
 * центрально кропается под пропорции экрана и выглядит как неожиданный зум
 * (на 20:9 теряется до 40% ширины сенсора). Нам нужен полный кадр: чем больше
 * сцены попало в фото, тем лучше работает описание сцены и распознавание.
 *
 * Значение — компромисс. Плагин масштабирует к этим границам безусловно,
 * поэтому слишком мало (1920) заметно режет детализацию мелкого текста для
 * OCR, а слишком много бессмысленно раздувает файл апскейлом на слабых
 * камерах и замедляет выгрузку с мобильного интернета. На iOS порог выше
 * 1920 дополнительно включает полноразмерный захват (isHighResolutionPhoto).
 */
const CAPTURE_MAX_SIDE = 2560;

export const nativePhotoCamera: PhotoCameraPort = {
  mode: 'native-preview',

  startPreview: () =>
    runExclusive(async () => {
      if (previewActive) {
        return;
      }
      setTransparent(true);
      try {
        await CameraPreview.start({
          position: 'rear',
          toBack: true,
          disableAudio: true,
          // 4:3 — родное соотношение сенсора. Важно не только для превью:
          // на Android CameraX отдаёт ImageCapture тот же ResolutionSelector,
          // что и превью, поэтому '16:9' резал снимок до 16:9 из кадра 4:3 —
          // терялись верх и низ, и это выглядело как подзум. На iOS такого
          // нет: AVCapturePhotoOutput всегда снимает полный кадр сенсора.
          aspectRatio: '4:3',
          // 'contain' (дефолт) оставлял серые поля вокруг кадра — растягиваем
          // превью на весь экран. На сам снимок это не влияет.
          aspectMode: 'cover',
        });
        previewActive = true;
      } catch (error) {
        setTransparent(false);
        throw error;
      }
    }),

  stopPreview: () =>
    runExclusive(async () => {
      previewActive = false;
      // Класс снимаем и камеру гасим безусловно: даже если старт не успел
      // доложить об успехе, нативное превью уже могло подняться.
      setTransparent(false);
      await CameraPreview.stop().catch(() => {});
    }),

  capture: async () => {
    if (!previewActive) {
      return null;
    }
    const { value } = await CameraPreview.capture({
      quality: 90,
      width: CAPTURE_MAX_SIDE,
      height: CAPTURE_MAX_SIDE,
      // photoQualityPrioritization намеренно НЕ передаём: на iOS значение выше
      // maxPhotoQualityPrioritization у AVCapturePhotoOutput (по умолчанию
      // .balanced) роняет приложение через NSInvalidArgumentException, а плагин
      // этот максимум не поднимает. Разница в качестве не стоит краша.
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
