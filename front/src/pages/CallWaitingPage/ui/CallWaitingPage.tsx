import { Phone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useShallow } from 'zustand/shallow';

import { useCallStore } from '@/features/calls';
import { useProfile } from '@/features/profile';
import { announceRouteChange } from '@/shared/lib/a11y/announcer';
import { Button } from '@/shared/ui/Button';

import './CallWaitingPage.scss';

const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const STATUS: Record<string, string> = {
  requesting: 'Соединяем…',
  searching: 'Волонтёр найден, дозваниваемся',
  waiting: 'Все волонтёры заняты. Вы в очереди',
  matched: 'Волонтёр на связи',
  idle: 'Соединяем…',
};

export const CallWaitingPage = () => {
  const navigate = useNavigate();
  const [seconds, setSeconds] = useState(0);
  const { data: profile, isLoading } = useProfile();
  const isVolunteer = profile?.role === 'volunteer';

  const { phase, requestHelp } = useCallStore(
    useShallow((s) => ({ phase: s.phase, requestHelp: s.requestHelp })),
  );

  // Вызов волонтёра — действие незрячего. Волонтёра сюда не пускаем.
  useEffect(() => {
    if (!isLoading && isVolunteer) {
      void navigate('/volunteer', { replace: true });
    }
  }, [isLoading, isVolunteer, navigate]);

  // Стартуем запрос при входе на экран; на выходе без матча — отменяем.
  useEffect(() => {
    if (isVolunteer) {
      return;
    }
    requestHelp();
    announceRouteChange('Ищем волонтёра. Пожалуйста, подождите.');

    return () => {
      const { phase: current, cancelRequest } = useCallStore.getState();
      if (current !== 'matched') {
        cancelRequest();
      }
    };
  }, [requestHelp, isVolunteer]);

  // Секундомер ожидания.
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Озвучиваем смену статуса незрячему.
  useEffect(() => {
    if (phase === 'searching') {
      announceRouteChange('Волонтёр найден, дозваниваемся.');
    }
    if (phase === 'waiting') {
      announceRouteChange('Все волонтёры заняты, вы в очереди.');
    }
  }, [phase]);

  const handleCancel = () => {
    useCallStore.getState().cancelRequest();
    announceRouteChange('Вызов отменён.');
    void navigate('/help', { replace: true });
  };

  return (
    <main id="main-content" className="call-wait" tabIndex={-1} aria-label="Поиск волонтёра">
      <div className="call-wait__head">
        <h1 className="call-wait__title">Ищем волонтёра</h1>
        <p className="call-wait__timer" aria-hidden="true">
          {formatTime(seconds)}
        </p>
        <p className="call-wait__status" role="status" aria-live="polite" aria-atomic="true">
          {STATUS[phase] ?? STATUS.requesting}
        </p>
      </div>

      <div className="call-wait__pulse" aria-hidden="true">
        <span className="call-wait__ring call-wait__ring--1" />
        <span className="call-wait__ring call-wait__ring--2" />
        <span className="call-wait__disc">
          <Phone size={56} />
        </span>
      </div>

      <section className="call-wait__info" aria-label="Что доступно волонтёру">
        <h2 className="call-wait__info-title">Что доступно волонтёру</h2>
        <ul className="call-wait__info-list">
          <li className="call-wait__info-yes">Поток с задней камеры</li>
          <li className="call-wait__info-yes">Ваш голос</li>
          <li className="call-wait__info-no">Имя, телефон, локация — скрыты</li>
        </ul>
      </section>

      <Button danger outline onClick={handleCancel} aria-label="Отменить вызов волонтёра">
        Отменить
      </Button>
    </main>
  );
};
