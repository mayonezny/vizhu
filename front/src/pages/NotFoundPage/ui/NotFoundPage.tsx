import { useNavigate } from 'react-router';

import { Button } from '@/shared/ui/Button';
import { Logo } from '@/shared/ui/Logo';

import './NotFoundPage.scss';

export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <main id="main-content" className="not-found" tabIndex={-1} aria-labelledby="not-found-title">
      <header className="not-found__logo-wrap">
        <Logo />
      </header>

      <div className="not-found__body">
        <p className="not-found__code" aria-hidden="true">
          404
        </p>
        <h1 id="not-found-title" className="not-found__title">
          Нет такой страницы
        </h1>
        <p className="not-found__desc">Страница не существует или была удалена.</p>
        <Button onClick={() => void navigate('/', { replace: true })}>На главную</Button>
      </div>
    </main>
  );
};
