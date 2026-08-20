import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

import { bootstrapAuth } from '@/features/auth';
import { isNativePlatform } from '@/shared/platform';

import { initPlatform } from './platform-init';
import { AppProviders } from './providers';
import { createAppRouter } from './router';

// i18n должен быть инициализирован до рендера — иначе первый рендер будет без переводов
import '@/shared/lib/i18n';
import './index.css';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Элемент #root не найден. Проверьте index.html.');
}

const removePreloader = () => {
  const preloader = document.getElementById('app-preloader');
  if (preloader) {
    preloader.classList.add('hidden');
    setTimeout(() => preloader.remove(), 400);
  }
};

const startApp = () => {
  // Роутер создаётся ЗДЕСЬ, а не на импорте модуля: createBrowserRouter
  // сразу гоняет гарды, а они должны видеть состояние ПОСЛЕ бутстрапа.
  createRoot(root).render(
    <StrictMode>
      <AppProviders>
        <RouterProvider router={createAppRouter()} />
      </AppProviders>
    </StrictMode>,
  );
  removePreloader();
};

// PWA-сервис-воркер регистрируем только в браузере: внутри Capacitor ассеты
// и так локальные, а кэш Workbox лишь добавил бы несвежих данных.
if (import.meta.env.PROD && !isNativePlatform() && 'serviceWorker' in navigator) {
  void import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }));
}

// Порядок важен: сначала нативные реализации портов + rehydrate персистов
// (на Capacitor), потом восстановление access-токена тихим /auth/refresh —
// иначе гарды роутера и первые запросы уйдут без авторизации.
const bootstrap = async () => {
  // Ошибки не глотаем молча: если нативные реализации не поднялись, приложение
  // тихо деградирует до web-портов (secureStorage в памяти → слетает сессия),
  // и без этого лога причину не найти.
  await initPlatform().catch((error: unknown) => {
    console.error('[platform] Не удалось инициализировать нативные порты', error);
  });
  await bootstrapAuth().catch((error: unknown) => {
    console.error('[auth] bootstrap упал', error);
  });
  startApp();
};

if (import.meta.env.DEV) {
  // MSW должен стартовать до bootstrapAuth — refresh-запрос идёт через моки.
  await import('@/shared/api/mocks/browser').then(({ worker }) => {
    void worker
      .start({ onUnhandledRequest: 'bypass' })
      .then(bootstrap)
      .catch(() => void bootstrap());
  });
} else {
  void bootstrap();
}
