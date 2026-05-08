import { Outlet } from 'react-router';

import { Logo } from '@/shared/ui/Logo';

import './onboarding-layout.scss';

export const OnboardingLayout = () => (
  <div className="onboarding-layout">
    <header className="onboarding-layout__header" role="banner">
      <Logo />
    </header>

    <main id="main-content" className="onboarding-layout__main" tabIndex={-1}>
      <Outlet />
    </main>
  </div>
);
