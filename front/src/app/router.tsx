import { createBrowserRouter, redirect } from 'react-router';

import { useAuthStore } from '@/features/auth';
import { useOnboardingStore } from '@/features/onboarding';
import { AuthPage } from '@/pages/AuthPage';
import { DialogPage } from '@/pages/DialogPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { HomePage } from '@/pages/HomePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { OnboardingLayout } from '@/widgets/OnboardingLayout';
import { PageLayout } from '@/widgets/PageLayout';
import { RootLayout } from '@/widgets/RootLayout';

const isAuthed = () => useAuthStore.getState().isAuthed;
const hasSeenOnboarding = () => useOnboardingStore.getState().hasSeen;

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
      { path: 'dialog', element: <DialogPage />, loader: requireAuth },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
