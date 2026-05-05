import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';

import { announceRouteChange } from '@/shared/lib/a11y';
import './root-layout.scss';

/**
 * Корневая обёртка всего приложения. Не содержит UI — только инфраструктура доступности.
 *
 * Что здесь живёт:
 * - skip-link: первый элемент в DOM, позволяет скринридеру и клавиатуре перепрыгнуть навигацию
 * - sr-announcer: невидимый aria-live регион, скринридер следит за ним (см. announcer.ts)
 * - useEffect: при каждой смене роута сдвигает фокус на <main> и объявляет название страницы
 *
 * Вложенность в роутере:
 *   RootLayout → PageLayout (или другой лейаут) → страница
 * Для фуллскрин страниц (камера и т.п.) можно подключать прямо под RootLayout без PageLayout —
 * тогда нужно самостоятельно добавить <main id="main-content" tabIndex={-1}> на странице.
 */

export const RootLayout = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    document.getElementById('main-content')?.focus();
    announceRouteChange(document.title);
  }, [pathname]);

  return (
    <>
      <a href="#main-content" className="skip-link">
        Перейти к основному содержимому
      </a>

      <Outlet />

      <div
        id="sr-announcer"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="visually-hidden"
      />
    </>
  );
};
