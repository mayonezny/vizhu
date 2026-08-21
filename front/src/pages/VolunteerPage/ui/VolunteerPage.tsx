import { HeartHandshake, Power } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useShallow } from 'zustand/shallow';

import { primeAudio, useCallStore } from '@/features/calls';
import { useProfile } from '@/features/profile';
import { announceRouteChange } from '@/shared/lib/a11y/announcer';
import { platform } from '@/shared/platform';

import './VolunteerPage.scss';

export const VolunteerPage = () => {
  const navigate = useNavigate();
  const { data: profile, isLoading } = useProfile();

  const { intent, phase, goOnline, goOffline } = useCallStore(
    useShallow((s) => ({
      intent: s.intent,
      phase: s.phase,
      goOnline: s.goOnline,
      goOffline: s.goOffline,
    })),
  );

  const isOnline = intent === 'volunteer';

  // Гейт: кабинет только для волонтёров.
  useEffect(() => {
    if (!isLoading && profile && profile.role !== 'volunteer') {
      void navigate('/', { replace: true });
    }
  }, [isLoading, profile, navigate]);

  useEffect(() => {
    announceRouteChange('Кабинет волонтёра. Встаньте на линию, чтобы принимать звонки.');
  }, []);

  const handleToggle = () => {
    if (isOnline) {
      goOffline();
      toast.info('Вы ушли с линии');
      announceRouteChange('Вы ушли с линии. Звонки больше не поступают.');
    } else {
      // Жест пользователя: разблокируем аудио, чтобы рингтон входящего звучал,
      // и здесь же просим разрешение на уведомления — на регистрации тумблер
      // по умолчанию выключен, а без разрешения волонтёр со свёрнутым окном
      // о звонке не узнает. Момент подходящий: человек как раз заявляет,
      // что готов принимать вызовы.
      primeAudio();
      void platform.permissions.request('notifications');
      goOnline();
      toast.success('Вы на линии — ждём звонки');
      announceRouteChange('Вы на линии. Ждём входящие звонки.');
    }
  };

  const statusText = isOnline
    ? phase === 'incoming'
      ? 'Входящий звонок…'
      : 'Вы на линии — ждём звонки'
    : 'Вы не на линии';

  return (
    <div className="volunteer">
      <header className="volunteer__head">
        <span className="volunteer__badge" aria-hidden="true">
          <HeartHandshake size={28} />
        </span>
        <h2 className="volunteer__title">Кабинет волонтёра</h2>
        <p className="volunteer__subtitle">
          Встаньте на линию — вам будут приходить звонки от незрячих.
        </p>
      </header>

      <div className="volunteer__stage">
        <button
          type="button"
          className={`volunteer__toggle${isOnline ? ' volunteer__toggle--online' : ''}`}
          onClick={handleToggle}
          aria-pressed={isOnline}
          aria-label={isOnline ? 'Уйти с линии' : 'Встать на линию'}
        >
          <span className="volunteer__toggle-icon" aria-hidden="true">
            <Power size={44} />
          </span>
          <span className="volunteer__toggle-label">
            {isOnline ? 'Уйти с линии' : 'Встать на линию'}
          </span>
        </button>

        <p
          className={`volunteer__status${isOnline ? ' volunteer__status--online' : ''}`}
          role="status"
          aria-live="polite"
        >
          {statusText}
        </p>
      </div>

      <section className="volunteer__note" aria-label="Как это работает">
        <p className="volunteer__note-text">
          Пока вы на линии, звонок придёт автоматически. Вы увидите камеру незрячего и сможете
          подсказывать голосом. Камеру видит только вы — незрячий вас не видит.
        </p>
      </section>
    </div>
  );
};
