import { Sun } from 'lucide-react';
import { Outlet, useMatches } from 'react-router';

import { useTheme } from '@/shared/lib/theme';
import { RoundButton } from '@/shared/ui/RoundButton';

import { LogoHeader } from './LogoHeader';
import { Navigation } from './Navigation';
import { TitleHeader } from './TitleHeader';

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

  const { toggle } = useTheme();

  const renderHeader = () => {
    if (handle?.headerVariant === 'back') {
      return <TitleHeader title={handle.title} />;
    }
    return <LogoHeader />;
  };

  return (
    <div className="page-layout">
      <header className="page-layout__header" role="banner">
        {renderHeader()}
        <RoundButton icon={<Sun size={24} />} aria-label="Кнопка смены темы" onClick={toggle} />
      </header>

      <main id="main-content" className="page-layout__main" tabIndex={-1}>
        <Outlet />
      </main>

      <Navigation />
    </div>
  );
};
