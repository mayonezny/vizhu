import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useShallow } from 'zustand/shallow';

import { useCallStore } from '@/features/calls';

import { IncomingCallOverlay } from './IncomingCallOverlay';

/**
 * Глобальный «дирижёр» матчинга. Живёт над всеми страницами (в RootLayout):
 *
 * - навешивает слушатели сокета один раз (init),
 * - при сведении пары переводит на экран звонка,
 * - показывает волонтёру входящий поверх любой страницы.
 */
export const CallsOrchestrator = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const { phase, match, incoming, init } = useCallStore(
    useShallow((s) => ({
      phase: s.phase,
      match: s.match,
      incoming: s.incoming,
      init: s.init,
    })),
  );

  const handledRoomRef = useRef<string | null>(null);

  useEffect(() => {
    init();
  }, [init]);

  // При матче — заводим обе стороны в комнату (один раз на комнату).
  useEffect(() => {
    if (phase === 'matched' && match && handledRoomRef.current !== match.room) {
      handledRoomRef.current = match.room;
      if (pathname !== '/call/room') {
        void navigate('/call/room');
      }
    }
    if (!match) {
      handledRoomRef.current = null;
    }
  }, [phase, match, pathname, navigate]);

  if (phase === 'incoming' && incoming) {
    return <IncomingCallOverlay requestId={incoming.requestId} />;
  }

  return null;
};
