import { Outlet } from 'react-router-dom';

import './layout.scss';

export const Layout = () => (
  <div className="layout">
    <main className="layout__main">
      <Outlet />
    </main>
  </div>
);
