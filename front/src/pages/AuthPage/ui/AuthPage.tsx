import { Phone, Play } from 'lucide-react';
import { useNavigate } from 'react-router';

import { useAuthStore } from '@/features/auth';
import { useToastStore } from '@/features/toast';
import { announceRouteChange } from '@/shared/lib/a11y/announcer';
import { Button } from '@/shared/ui/Button';
import { Logo } from '@/shared/ui/Logo';

import './AuthPage.scss';

export const AuthPage = () => {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const { showToast } = useToastStore();

  const handleDemoMode = () => {
    login('');
    void navigate('/onboarding', { replace: true });
  };

  const handlePhoneAuth = () => {
    void navigate('/auth/phone');
  };

  const handleGosuslugiAuth = () => {
    announceRouteChange('Вход через Госуслуги — функция в разработке');
    showToast('Вход через Госуслуги — функция в разработке');
  };

  return (
    <main id="main-content" className="auth" tabIndex={-1} aria-labelledby="auth-title">
      <header className="auth__logo-wrap">
        <Logo />
      </header>

      <div className="auth__head">
        <h1 id="auth-title" className="auth__title">
          Вход или регистрация
        </h1>
        <p className="auth__desc">
          Введите номер телефона — отправим код в SMS. Если вы новый пользователь — создадим
          аккаунт.
        </p>
      </div>

      <div className="auth__actions" aria-label="Способы входа">
        <Button
          icon={<Phone size={24} />}
          iconPosition="left"
          onClick={handlePhoneAuth}
          aria-label="Войти или зарегистрироваться по номеру телефона"
        >
          Войти по номеру
        </Button>

        <Button
          iconPosition="right"
          onClick={handleGosuslugiAuth}
          aria-label="Войти через портал Госуслуг"
        >
          Войти через Госуслуги
        </Button>

        <div className="auth__separator" role="separator" aria-label="или">
          <span aria-hidden="true">или</span>
        </div>

        <Button
          className="btn--demo"
          icon={<Play />}
          iconPosition="left"
          onClick={handleDemoMode}
          aria-label="Попробовать демо-режим без регистрации. Данные не сохраняются."
        >
          Demo-режим без входа
        </Button>

        <p className="auth__demo-hint" aria-hidden="true">
          Попробуйте все функции без регистрации. Данные не сохраняются.
        </p>
      </div>

      <footer className="auth__legal">
        <p>
          Продолжая, вы соглашаетесь с{' '}
          <a href="/privacy" className="auth__link">
            политикой обработки ПДн
          </a>{' '}
          и{' '}
          <a href="/terms" className="auth__link">
            пользовательским соглашением
          </a>
          .
        </p>
      </footer>
    </main>
  );
};
