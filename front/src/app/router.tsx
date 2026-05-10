import { createBrowserRouter, redirect } from 'react-router';

import { useAuthStore } from '@/features/auth';
import { useOnboardingStore } from '@/features/onboarding';
import { AuthPage } from '@/pages/AuthPage';
import { DialogPage } from '@/pages/DialogPage';
import { HistoryDetailPage } from '@/pages/HistoryDetailPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { HomePage } from '@/pages/HomePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { PhoneAuthPage } from '@/pages/PhoneAuthPage';
import { SmsCodePage } from '@/pages/SmsCodePage';
import { WelcomePage } from '@/pages/WelcomePage';
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

const requirePhone = () => {
  if (!useAuthStore.getState().phone) {
    return redirect('/auth/phone');
  }
  return null;
};

const requireAuthForWelcome = () => {
  if (!isAuthed()) {
    return redirect('/auth');
  }
  return null;
};

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
        loader: redirectIfAuthed,
        children: [
          { index: true, element: <AuthPage /> },
          { path: 'phone', element: <PhoneAuthPage /> },
          { path: 'code', element: <SmsCodePage />, loader: requirePhone },
        ],
      },
      {
        path: 'auth/welcome',
        element: <WelcomePage />,
        loader: requireAuthForWelcome,
      },
      {
        element: <OnboardingLayout />,
        children: [{ path: 'onboarding', element: <OnboardingPage /> }],
      },
      { path: 'dialog', element: <DialogPage />, loader: requireAuth },
      { path: 'history/:id', element: <HistoryDetailPage />, loader: requireAuth },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
