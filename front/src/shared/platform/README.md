# Платформенный слой (web + Capacitor)

Все обращения к платформенным возможностям (камера, вибрация, рингтон,
разрешения, хранилища) идут через порты из [types.ts](./types.ts) и синглтон
`platform` из [index.ts](./index.ts).

- **Web/PWA** — реализации `./web/*`, зарегистрированы по умолчанию. PWA
  работает ровно как раньше.
- **Capacitor** — реализации `./native/*`, подключаются в
  `app/platform-init.ts` (динамический импорт, чтобы плагины не попадали в
  web-бандл) до бутстрапа авторизации и рендера. Там же — `persist.rehydrate()`
  всех персист-сторов: они создаются при импорте модулей, раньше, чем успевает
  зарегистрироваться асинхронный Preferences-storage.

## Порты

| Порт            | Web                                                | Native (Capacitor)                                                                                                  |
| --------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `photoCamera`   | inline: страница сама рендерит getUserMedia-превью | `@capgo/camera-preview` (toBack: нативное превью ПОЗАДИ WebView, наш UI сверху) + галерея через `@capacitor/camera` |
| `callAlert`     | WebAudio-«дзинь» + вибрация                        | тот же WebAudio + нативный haptics; фоновые входящие (push/CallKit) — TODO                                          |
| `haptics`       | `navigator.vibrate` (iOS Safari — no-op)           | `@capacitor/haptics` (работает и на iOS)                                                                            |
| `permissions`   | Permissions API / getUserMedia-проба               | camera → плагин Camera, notifications → LocalNotifications; mic/geo — системные диалоги WebView                     |
| `stateStorage`  | localStorage                                       | `@capacitor/preferences`                                                                                            |
| `secureStorage` | память процесса (не персистится — осознанно)       | `capacitor-secure-storage-plugin` (Keychain / EncryptedSharedPreferences)                                           |

## Токены

- **Access-токен** — только в памяти (`shared/api/token-store.ts`), нигде не
  персистится. При старте `features/auth/model/bootstrap.ts` восстанавливает
  его через `refreshSession()` (`shared/api/axios.ts`).
- **Web:** refresh-токен — httpOnly-кука, клиент его не видит.
- **Native:** все запросы уходят с заголовком `X-Client: native`; бэкенд
  (`api/src/modules/auth/auth.controller.ts`) для такого клиента возвращает
  refresh-токен в теле ответа (verify-otp, refresh) и принимает его в теле
  (refresh, logout). Фронт хранит его в `platform.secureStorage`
  (`shared/api/refresh-token-store.ts`) и ротацию сохраняет автоматически.
- CORS для origin'ов оболочки (`capacitor://localhost`, `https://localhost`)
  включён в `api/src/main.ts`.

## Прозрачность под нативное превью камеры

`native/photo-camera.ts` на время превью вешает класс `camera-preview-active`
на `body`; правила прозрачности — в `app/index.css`. Если появится новая
страница с превью — её корневой фон тоже должен стать прозрачным под этим
классом.

## Что НЕ абстрагировано сознательно

- **Живое видео звонка** (`use-livekit-room.ts`) — WebRTC/LiveKit работает в
  Capacitor WebView как есть. Разрешения прописаны: iOS —
  `NSCameraUsageDescription` и др. в `ios/App/App/Info.plist`, Android —
  CAMERA/RECORD_AUDIO/... в `android/app/src/main/AndroidManifest.xml`.
- **Запись голоса** (`use-voice-record.ts`) — MediaRecorder поддержан в WebView.
- **Язык i18n** — синхронный localStorage; потеря значения некритична.
- **SW/PWA** — регистрация вручную в `main.tsx`, в нативке пропускается.

## TODO на потом

- Push для входящих звонков (волонтёр в фоне): FCM/APNs + рассылка на бэке,
  нативный `callAlert` (локальное уведомление со звуком, в идеале
  CallKit/ConnectionService).
- Очередь мэтчинга на Redis (см. коммит f94d603) — не про этот слой, но
  блокер прод-версии.
