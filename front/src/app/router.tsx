import { createBrowserRouter, redirect } from 'react-router';

import { AuthPage } from '@/pages/AuthPage';
import { DemoPage } from '@/pages/DemoPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { HomePage } from '@/pages/HomePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { OnboardingLayout } from '@/widgets/OnboardingLayout';
import { PageLayout } from '@/widgets/PageLayout';
import { RootLayout } from '@/widgets/RootLayout';

const DEMO_KEY = 'vizhu_demo_mode';
const ONBOARDING_KEY = 'vizhu_onboarding_seen';

const isAuthed = () => Boolean(localStorage.getItem(DEMO_KEY));
const hasSeenOnboarding = () => Boolean(localStorage.getItem(ONBOARDING_KEY));

const requireAuth = () => {
  if (!isAuthed()) {
    return redirect('/auth');
  }
  if (!hasSeenOnboarding()) {
    return redirect('/onboarding');
  }
  return null;
};

const redirectIfAuthed = () => (isAuthed() ? redirect('/') : null);

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        element: <PageLayout />,
        loader: requireAuth,
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
        path: 'auth',
        element: <AuthPage />,
        loader: redirectIfAuthed,
      },
      {
        element: <OnboardingLayout />,
        children: [{ path: 'onboarding', element: <OnboardingPage /> }],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
