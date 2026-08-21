import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { StatusBar } from '@capacitor/status-bar';
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

/**
 * Геометрия превью: контейнер строго во весь экран, начало координат в углу.
 *
 * - `aspectRatio` из API плагина не используем: на Android он ужимает
 *   контейнер (height = width / ratio) и вдобавок навязывает ImageCapture тот
 *   же ResolutionSelector, из-за чего обрезался сам снимок;
 * - размеры обязательно задаём явно: без них плагин выбирает их сам и
 *   оставляет полосу, а `aspectMode` этого не лечит — он масштабирует кадр
 *   внутри контейнера, а не сам контейнер;
 * - x/y тоже задаём явно: незаданные координаты включают авто-центрирование,
 *   и незанятое место разъезжается полосами сверху и снизу.
 *
 * Итог: `cover` растягивает кадр на весь экран, обрезая края по вертикали,
 * а съёмка остаётся в максимальном разрешении сенсора — файл получает полный
 * кадр 4:3. То есть на фото попадает чуть больше, чем видно в превью; для
 * нейропомощника это плюс, ИИ получает больше сцены.
 */

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
        await StatusBar.setOverlaysWebView({ overlay: true });
        await CameraPreview.start({
          position: 'rear',
          toBack: true,
          disableAudio: true,
          x: 0,
          y: 0,
          width: Math.round(window.innerWidth),
          height: Math.round(window.innerHeight + (await StatusBar.getInfo()).height) + 1,
          aspectMode: 'cover',
        });
        previewActive = true;
      } catch (error) {
        await StatusBar.setOverlaysWebView({ overlay: false });
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
      await StatusBar.setOverlaysWebView({ overlay: false });
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
