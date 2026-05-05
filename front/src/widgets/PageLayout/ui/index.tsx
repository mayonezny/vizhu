import { House, History, Headset, User } from 'lucide-react';
import { NavLink, Outlet, useMatches } from 'react-router';
import type { NavLinkRenderProps } from 'react-router';

import { BackHeader } from './BackHeader';
import { LogoHeader } from './LogoHeader';
import './page-layout.scss';

type RouteHandle = { headerVariant?: 'logo' } | { headerVariant: 'back'; title: string };

/**
 * Лейаут для обычных страниц: хедер + контент + нижняя навигация.
 *
 * Вариант хедера и заголовок задаются через handle роута в router.tsx:
 *   { path: 'settings', element: <SettingsPage />, handle: { title: 'Настройки', headerVariant: 'back' } }
 *   { index: true, element: <HomePage />, handle: { headerVariant: 'logo' } }
 *
 * Новый вариант хедера — добавь компонент рядом (LogoHeader/BackHeader) и новое значение в RouteHandle.
 *
 * <main id="main-content"> обязателен: на него ведёт skip-link из RootLayout,
 * и туда RootLayout сдвигает фокус при смене роута.
 */

export const PageLayout = () => {
  const matches = useMatches();
  const handle = matches.at(-1)?.handle as RouteHandle | undefined;

  const renderHeader = () => {
    if (handle?.headerVariant === 'back') {
      return <BackHeader title={handle.title} />;
    }
    return <LogoHeader />;
  };

  const getNavLinkClass = ({ isActive }: NavLinkRenderProps) =>
    isActive ? 'nav-link nav-link--active' : 'nav-link';

  return (
    <div className="page-layout">
      <header className="page-layout__header" role="banner">
        {renderHeader()}
      </header>

      <main id="main-content" className="page-layout__main" tabIndex={-1}>
        <Outlet />
      </main>

      <nav className="page-layout__nav" aria-label="Основная навигация">
        <NavLink to="/" end className={getNavLinkClass}>
          <House size={32} aria-hidden="true" />
          <span className="page-layout__nav-label">Главная</span>
        </NavLink>

        <NavLink to="/history" className={getNavLinkClass}>
          <History size={32} aria-hidden="true" />
          <span className="page-layout__nav-label">История</span>
        </NavLink>

        <NavLink to="/help" className={getNavLinkClass}>
          <Headset size={32} aria-hidden="true" />
          <span className="page-layout__nav-label">Помощь</span>
        </NavLink>

        <NavLink to="/profile" className={getNavLinkClass}>
          <User size={32} aria-hidden="true" />
          <span className="page-layout__nav-label">Профиль</span>
        </NavLink>
      </nav>
    </div>
  );
};
