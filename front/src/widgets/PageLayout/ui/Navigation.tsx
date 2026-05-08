import { House, History, Headset, User } from 'lucide-react';
import { NavLink } from 'react-router';
import type { NavLinkRenderProps } from 'react-router';

export const Navigation = () => {
  const getNavLinkClass = ({ isActive }: NavLinkRenderProps) =>
    isActive ? 'nav-link nav-link--active' : 'nav-link';

  return (
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
  );
};
