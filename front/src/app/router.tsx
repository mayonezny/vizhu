import { createBrowserRouter } from 'react-router-dom';

import { DemoPage } from '@/pages/DemoPage';
import { HomePage } from '@/pages/HomePage';
import { Layout } from '@/widgets/Layout';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'demo', element: <DemoPage /> },
    ],
  },
]);
