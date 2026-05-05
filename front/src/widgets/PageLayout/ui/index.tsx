import { NavLink, Outlet, useMatches } from 'react-router-dom';

import { BackHeader } from './BackHeader';
import { LogoHeader } from './LogoHeader';
import './page-layout.scss';

type HeaderVariant = 'logo' | 'back';

interface RouteHandle {
  title?: string;
  headerVariant?: HeaderVariant;
}

/**
 * Лейаут для обычных страниц: хедер + контент + нижняя навигация.
 *
 * Вариант хедера и заголовок задаются через handle роута в router.tsx:
 *   { path: 'settings', element: <SettingsPage />, handle: { title: 'Настройки', headerVariant: 'back' } }
 *   { index: true, element: <HomePage />, handle: { headerVariant: 'logo' } }
 *
 * Новый вариант хедера — добавь компонент рядом (LogoHeader/BackHeader) и новое значение в HeaderVariant.
 *
 * <main id="main-content"> обязателен: на него ведёт skip-link из RootLayout,
 * и туда RootLayout сдвигает фокус при смене роута.
 */

export const PageLayout = () => {
  const matches = useMatches();
  const handle = matches.at(-1)?.handle as RouteHandle | undefined;
  const { title, headerVariant = 'logo' } = handle ?? {};

  const renderHeader = () => {
    if (headerVariant === 'back') {
      return <BackHeader title={title} />;
    }
    return <LogoHeader />;
  };

  return (
    <div className="page-layout">
      <header className="page-layout__header" role="banner">
        {renderHeader()}
      </header>

      <main id="main-content" className="page-layout__main" tabIndex={-1}>
        <Outlet />
      </main>

      <nav className="page-layout__nav" aria-label="Основная навигация">
        <NavLink to="/" end aria-label="Главная">
          {/* icon */}
        </NavLink>
        <NavLink to="/history" aria-label="История">
          {/* icon */}
        </NavLink>
        <NavLink to="/help" aria-label="Помощь">
          {/* icon */}
        </NavLink>
        <NavLink to="/profile" aria-label="Профиль">
          {/* icon */}
        </NavLink>
      </nav>
    </div>
  );
};
