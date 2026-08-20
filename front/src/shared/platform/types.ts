/**
 * Порты платформенных возможностей.
 *
 * Каждый порт — контракт между приложением и конкретной платформой
 * (web-браузер сейчас, Capacitor iOS/Android позже). Приложение зависит
 * только от этих интерфейсов; реализации подменяются через `registerPlatform`
 * (см. ./index.ts) без изменения потребителей.
 */

// ─── Разрешения ───────────────────────────────────────────────────────────────

export type PermissionKind = 'camera' | 'microphone' | 'geolocation' | 'notifications';

export type PlatformPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

export interface PermissionsPort {
  /** Текущее состояние разрешения без показа системного диалога. */
  check(kind: PermissionKind): Promise<PlatformPermissionState>;
  /** Запросить разрешение (системный диалог). Отказ не бросает — вернёт состояние. */
  request(kind: PermissionKind): Promise<PlatformPermissionState>;
  /**
   * Запросить несколько разрешений разом. Web-реализация объединяет
   * camera+microphone в один getUserMedia-промпт; натив запрашивает по плагинам.
   */
  requestMany(kinds: PermissionKind[]): Promise<void>;
}

// ─── Хранилище состояния (zustand persist, настройки) ────────────────────────

/**
 * Хранилище для персиста zustand-сторов и прочих настроек.
 * Сигнатура совместима с `StateStorage` из zustand/middleware:
 * web — синхронный localStorage, натив — асинхронный @capacitor/preferences.
 */
export interface StateStoragePort {
  getItem(name: string): string | null | Promise<string | null>;
  setItem(name: string, value: string): void | Promise<void>;
  removeItem(name: string): void | Promise<void>;
}

// ─── Защищённое хранилище (токены) ────────────────────────────────────────────

/**
 * Хранилище для секретов (refresh-токен на нативе — Keychain/EncryptedSharedPreferences).
 *
 * В web НЕ используется для токенов: access-токен живёт только в памяти
 * (см. shared/api/token-store), refresh-токен — в httpOnly-куке.
 * Порт существует, чтобы нативная реализация могла хранить refresh-токен,
 * когда куки в Capacitor WebView недоступны/ненадёжны.
 */
export interface SecureStoragePort {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

// ─── Фото-камера ──────────────────────────────────────────────────────────────

export type CapturedPhoto = {
  /** Готовый файл для отправки на бэкенд (image/jpeg). */
  file: File;
};

/**
 * Съёмка одиночного фото (сценарии нейропомощника: описание сцены, OCR, купюры).
 *
 * - `mode: 'inline'` (web) — страница сама рендерит getUserMedia-превью и
 *   кнопку затвора; startPreview/capture этого порта не используются.
 * - `mode: 'native-preview'` (Capacitor, @capgo/camera-preview) — нативное
 *   превью камеры рисуется ПОЗАДИ WebView (toBack), интерфейс страницы
 *   остаётся сверху. Страница делает фон прозрачным (реализация вешает класс
 *   `camera-preview-active` на body), затем startPreview → capture → stopPreview.
 *   Качество, автофокус и выбор объектива — нативные.
 *
 * Живое видео звонка сюда НЕ относится — оно остаётся на WebRTC/LiveKit
 * внутри WebView и на нативе.
 */
export interface PhotoCameraPort {
  readonly mode: 'inline' | 'native-preview';
  /** Запустить нативное превью (задняя камера) позади WebView. Бросает при отказе в доступе. */
  startPreview(): Promise<void>;
  /** Остановить превью и вернуть непрозрачный фон. Идемпотентно. */
  stopPreview(): Promise<void>;
  /** Снять кадр с активного превью. null — превью не запущено. */
  capture(): Promise<CapturedPhoto | null>;
  /** Открыть системную галерею. null — пользователь отменил. */
  pickFromGallery(): Promise<CapturedPhoto | null>;
}

// ─── Вибрация ─────────────────────────────────────────────────────────────────

export interface HapticsPort {
  /** Одиночный паттерн вибрации в мс: [вибрация, пауза, вибрация, ...]. */
  vibrate(pattern: number | number[]): void;
  /** Прервать текущую вибрацию. */
  stop(): void;
}

// ─── Оповещение о входящем звонке ────────────────────────────────────────────

/**
 * Рингтон + вибрация входящего звонка волонтёра.
 *
 * Web — WebAudio-«дзинь» + navigator.vibrate, работает только при открытой
 * вкладке. Натив — кандидат на локальное уведомление со звуком / CallKit
 * (iOS) / ConnectionService (Android), чтобы звонок будил приложение из фона.
 */
export interface CallAlertPort {
  /**
   * «Разогреть» аудио на пользовательском жесте (нажатие «встать на линию») —
   * иначе автоплей заблокирован браузером. На нативе может быть no-op.
   */
  prime(): void;
  /** Начать звонить (звук + вибрация по кругу). Идемпотентно. */
  start(): void;
  /** Остановить звонок. */
  stop(): void;
}

// ─── Композиция ───────────────────────────────────────────────────────────────

export interface PlatformServices {
  permissions: PermissionsPort;
  stateStorage: StateStoragePort;
  secureStorage: SecureStoragePort;
  photoCamera: PhotoCameraPort;
  haptics: HapticsPort;
  callAlert: CallAlertPort;
}
