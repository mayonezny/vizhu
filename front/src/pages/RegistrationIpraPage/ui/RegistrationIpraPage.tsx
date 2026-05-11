import { Check, ChevronLeft } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';

import { announceRouteChange } from '@/shared/lib/a11y/announcer';
import { Button } from '@/shared/ui/Button';
import { RoundButton } from '@/shared/ui/RoundButton';

import './RegistrationIpraPage.scss';

const BENEFITS = [
  'Неограниченный AI 24/7',
  'Приоритет в очереди волонтёров',
  'GPT-4o опционально',
  'Бесплатное обслуживание по ИПРА',
];

export const RegistrationIpraPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    announceRouteChange('Шаг 3 из 4. Подтверждение ИПРА и получение Premium.');
  }, []);

  const handleGosuslugi = () => {
    announceRouteChange('Вход через Госуслуги — функция в разработке');
  };

  const handleSkip = () => {
    void navigate('/registration/permissions');
  };

  return (
    <main id="main-content" className="reg-ipra" tabIndex={-1} aria-labelledby="reg-ipra-title">
      <div className="reg-ipra__back">
        <RoundButton
          aria-label="Назад"
          icon={<ChevronLeft size={24} />}
          onClick={() => void navigate('/registration/vision')}
        />
      </div>

      <div className="reg-ipra__head">
        <h1 id="reg-ipra-title" className="reg-ipra__title">
          Подтвердите ИПРА — и Premium бесплатно
        </h1>
        <p className="reg-ipra__desc">
          Один раз войдите через Госуслуги — проверим статус инвалида по зрению через ФРИ. Данные не
          сохраняем.
        </p>
      </div>

      <div className="reg-ipra__benefits" aria-label="Что вы получите">
        <ul className="reg-ipra__benefits-list">
          {BENEFITS.map((benefit) => (
            <li key={benefit} className="reg-ipra__benefit">
              <span className="reg-ipra__benefit-icon" aria-hidden="true">
                <Check size={18} />
              </span>
              {benefit}
            </li>
          ))}
        </ul>
      </div>

      <div className="reg-ipra__actions">
        <Button onClick={handleGosuslugi} aria-label="Войти через портал Госуслуг">
          Войти через Госуслуги
        </Button>

        <Button onClick={handleSkip} aria-label="Пропустить подтверждение ИПРА и продолжить">
          Пропустить
        </Button>
      </div>
    </main>
  );
};
