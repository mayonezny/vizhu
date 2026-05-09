import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

import { AppProviders } from './providers';
import { router } from './router';

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
  createRoot(root).render(
    <StrictMode>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </StrictMode>,
  );
  removePreloader();
};

if (import.meta.env.DEV) {
  await import('@/shared/api/mocks/browser').then(({ worker }) => {
    void worker.start({ onUnhandledRequest: 'bypass' }).then(startApp).catch(startApp);
  });
} else {
  startApp();
}
