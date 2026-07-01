import { Flame, HeartPulse, Phone, ShieldAlert } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';

import { useProfile } from '@/features/profile';
import { announceRouteChange } from '@/shared/lib/a11y/announcer';

import './HelpPage.scss';

type EmergencyService = {
  number: string;
  label: string;
  icon: React.ReactNode;
};

const EMERGENCY_SERVICES: EmergencyService[] = [
  { number: '112', label: 'Единая служба', icon: <ShieldAlert size={28} /> },
  { number: '103', label: 'Скорая помощь', icon: <HeartPulse size={28} /> },
  { number: '101', label: 'Пожарная охрана', icon: <Flame size={28} /> },
];

export const HelpPage = () => {
  const navigate = useNavigate();
  const { data: profile, isLoading } = useProfile();

  // «Помощь» — экран незрячего. Волонтёру здесь делать нечего → в кабинет.
  useEffect(() => {
    if (!isLoading && profile?.role === 'volunteer') {
      void navigate('/volunteer', { replace: true });
    }
  }, [isLoading, profile, navigate]);

  useEffect(() => {
    announceRouteChange('Помощь. Кнопка вызова волонтёра и телефоны экстренных служб.');
  }, []);

  return (
    <div className="help">
      <section aria-labelledby="help-volunteer-title" className="help__section">
        <h2 id="help-volunteer-title" className="visually-hidden">
          Вызов волонтёра
        </h2>
        <button
          type="button"
          className="help__volunteer"
          onClick={() => void navigate('/call/waiting')}
          aria-label="Вызвать волонтёра. Живой помощник ответит голосом за несколько секунд"
        >
          <span className="help__volunteer-content">
            <span className="help__volunteer-title">Вызвать волонтёра</span>
            <span className="help__volunteer-subtitle">Живой помощник ответит голосом</span>
          </span>
          <span className="help__volunteer-icon" aria-hidden="true">
            <Phone size={40} />
          </span>
        </button>
      </section>

      <section aria-labelledby="help-emergency-title" className="help__section">
        <h2 id="help-emergency-title" className="help__section-title">
          Экстренные службы
        </h2>
        <p className="help__section-desc">Звонок откроет набор номера на телефоне.</p>

        <ul className="help__emergency" aria-label="Телефоны экстренных служб">
          {EMERGENCY_SERVICES.map(({ number, label, icon }) => (
            <li key={number}>
              <a
                href={`tel:${number}`}
                className="help__emergency-item"
                aria-label={`Позвонить ${number}, ${label}`}
              >
                <span className="help__emergency-icon" aria-hidden="true">
                  {icon}
                </span>
                <span className="help__emergency-text">
                  <span className="help__emergency-number">{number}</span>
                  <span className="help__emergency-label">{label}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};
