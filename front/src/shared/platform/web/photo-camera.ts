import type { CapturedPhoto, PhotoCameraPort } from '../types';

/**
 * Web-реализация фото-камеры: режим 'inline'.
 *
 * В браузере страница диалога сама рендерит getUserMedia-превью с кнопкой
 * затвора (доступный сценарий для незрячего: озвучка «камера готова» +
 * большая кнопка), поэтому startPreview/capture здесь не поддержаны —
 * их вызов означает ошибку в логике страницы.
 *
 * Галерея — программный <input type="file">: работает по пользовательскому
 * жесту во всех целевых браузерах.
 */

const inlineOnly = (method: string) =>
  Promise.reject(
    new Error(`PhotoCameraPort: ${method} недоступен в inline-режиме (web). Проверьте mode.`),
  );

const pickViaInput = (): Promise<CapturedPhoto | null> =>
  new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = () => {
      const file = input.files?.[0] ?? null;
      resolve(file ? { file } : null);
    };
    // Отмена диалога выбора файла: событие cancel (Chrome 113+/Safari 16.4+).
    input.oncancel = () => resolve(null);

    input.click();
  });

export const webPhotoCamera: PhotoCameraPort = {
  mode: 'inline',
  startPreview: () => inlineOnly('startPreview') as Promise<void>,
  stopPreview: () => Promise.resolve(),
  capture: () => inlineOnly('capture') as Promise<CapturedPhoto | null>,
  pickFromGallery: pickViaInput,
};
