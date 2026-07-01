import { House, History, Headset, User } from 'lucide-react';
import { NavLink } from 'react-router';
import type { NavLinkRenderProps } from 'react-router';

import { useIsVolunteer } from '@/features/profile';

export const Navigation = () => {
  const isVolunteer = useIsVolunteer();

  const getNavLinkClass = ({ isActive }: NavLinkRenderProps) =>
    isActive ? 'nav-link nav-link--active' : 'nav-link';

  // Третий пункт зависит от роли: у незрячего — «Помощь», у волонтёра — «Кабинет».
  // Иконка одна и та же (Headset), отдельного пункта кабинета нет.
  const middle = isVolunteer
    ? { to: '/volunteer', label: 'Кабинет' }
    : { to: '/help', label: 'Помощь' };

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

      <NavLink to={middle.to} className={getNavLinkClass}>
        <Headset size={32} aria-hidden="true" />
        <span className="page-layout__nav-label">{middle.label}</span>
      </NavLink>

      <NavLink to="/profile" className={getNavLinkClass}>
        <User size={32} aria-hidden="true" />
        <span className="page-layout__nav-label">Профиль</span>
      </NavLink>
    </nav>
  );
};
