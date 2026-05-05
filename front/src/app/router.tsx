import { createBrowserRouter } from 'react-router-dom';

import { DemoPage } from '@/pages/DemoPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { HomePage } from '@/pages/HomePage';
import { PageLayout } from '@/widgets/PageLayout';
import { RootLayout } from '@/widgets/RootLayout';

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        // Страницы с хедером и нижней навигацией
        element: <PageLayout />,
        children: [
          { index: true, element: <HomePage />, handle: { title: 'Главная' } },
          { path: 'demo', element: <DemoPage />, handle: { title: 'Демо' } },
          {
            path: 'history',
            element: <HistoryPage />,
            handle: { title: 'История', headerVariant: 'back' },
          },
        ],
      },
      // Фуллскрин страницы (камера, онбординг) — добавляй сюда без PageLayout
      // { path: 'camera', element: <CameraPage /> },
    ],
  },
]);
