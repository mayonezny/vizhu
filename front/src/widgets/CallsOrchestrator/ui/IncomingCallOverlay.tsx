import { Phone, PhoneOff, User } from 'lucide-react';
import { useEffect } from 'react';

import { startRinging, stopRinging, useCallStore } from '@/features/calls';
import { announceRouteChange } from '@/shared/lib/a11y/announcer';

import './IncomingCallOverlay.scss';

type IncomingCallOverlayProps = {
  requestId: string;
};

/** Экран входящего звонка для волонтёра (в стиле телефонного вызова). */
export const IncomingCallOverlay = ({ requestId }: IncomingCallOverlayProps) => {
  const accept = useCallStore((s) => s.accept);
  const decline = useCallStore((s) => s.decline);

  useEffect(() => {
    announceRouteChange('Входящий звонок от незрячего. Принять или отклонить.');
    startRinging();
    return () => stopRinging();
  }, []);

  return (
    <div className="incoming" role="dialog" aria-modal="true" aria-labelledby="incoming-title">
      <div className="incoming__body">
        <span className="incoming__avatar" aria-hidden="true">
          <User size={64} />
        </span>
        <p className="incoming__caption">Входящий вызов</p>
        <h1 id="incoming-title" className="incoming__title">
          Требуется помощь
        </h1>
        <p className="incoming__hint">Вы увидите камеру и услышите голос</p>
      </div>

      <div className="incoming__actions" role="group" aria-label="Действия со звонком">
        <button
          type="button"
          className="incoming__btn incoming__btn--accept"
          onClick={() => accept(requestId)}
          aria-label="Принять звонок"
        >
          <Phone size={32} aria-hidden="true" />
          <span className="incoming__btn-label">Принять</span>
        </button>

        <button
          type="button"
          className="incoming__btn incoming__btn--decline"
          onClick={() => decline(requestId)}
          aria-label="Отклонить звонок"
        >
          <PhoneOff size={32} aria-hidden="true" />
          <span className="incoming__btn-label">Отклонить</span>
        </button>
      </div>
    </div>
  );
};
