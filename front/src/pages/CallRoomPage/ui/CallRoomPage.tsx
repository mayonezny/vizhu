import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';

import { useCallStore } from '@/features/calls';
import { useProfile } from '@/features/profile';

import { CallRoomStage } from './CallRoomStage';

import './CallRoomPage.scss';

export const CallRoomPage = () => {
  const navigate = useNavigate();
  const match = useCallStore((s) => s.match);
  const previewRole = useCallStore((s) => s.previewRole);
  const { data: profile, isLoading } = useProfile();

  // Нет активного матча (прямой переход/перезагрузка) — на экран помощи.
  useEffect(() => {
    if (!match) {
      void navigate('/help', { replace: true });
    }
  }, [match, navigate]);

  if (!match || isLoading || !profile) {
    return (
      <main id="main-content" className="call-room call-room--loading" tabIndex={-1}>
        <Loader2 size={48} className="call-room__spinner" aria-hidden="true" />
        <p role="status" aria-live="polite">
          Подключаемся к звонку…
        </p>
      </main>
    );
  }

  // В dev-превью роль можно форсировать (__previewCall('blind')), минуя профиль.
  const role = import.meta.env.DEV && previewRole ? previewRole : profile.role;

  return <CallRoomStage match={match} role={role} />;
};
