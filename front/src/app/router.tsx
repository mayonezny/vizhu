import { createBrowserRouter, redirect } from 'react-router';

import { DemoPage } from '@/pages/DemoPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { HomePage } from '@/pages/HomePage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { OnboardingLayout } from '@/widgets/OnboardingLayout';
import { PageLayout } from '@/widgets/PageLayout';
import { RootLayout } from '@/widgets/RootLayout';

const ONBOARDING_KEY = 'vizhu_onboarding_seen';

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        element: <PageLayout />,
        loader: () => {
          if (!localStorage.getItem(ONBOARDING_KEY)) {
            return redirect('/onboarding');
          }
          return null;
        },
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
      {
        element: <OnboardingLayout />,
        children: [{ path: 'onboarding', element: <OnboardingPage /> }],
      },
    ],
  },
]);
