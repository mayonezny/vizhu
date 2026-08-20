import type { UserRole } from '@/features/profile';
import { createStore } from '@/shared/lib/zustand';

import { getSocket } from './socket';
import type { CallIntent, CallPhase, IncomingCall, MatchInfo } from './types';

interface CallState {
  phase: CallPhase;
  intent: CallIntent;
  match: MatchInfo | null;
  incoming: IncomingCall | null;
  /** Внутреннее: слушатели сокета уже навешаны. */
  bound: boolean;
  /** Только для dev-превью: форс-роль экрана звонка, минуя профиль. */
  previewRole: UserRole | null;
}

interface CallActions {
  /** Навесить обработчики сокета один раз (вызывается оркестратором). */
  init: () => void;
  /** Волонтёр встаёт на линию. */
  goOnline: () => void;
  /** Волонтёр уходит с линии. */
  goOffline: () => void;
  /** Незрячий зовёт помощь. */
  requestHelp: () => void;
  /** Незрячий отменяет запрос (до соединения). */
  cancelRequest: () => void;
  /** Волонтёр принимает входящий. */
  accept: (requestId: string) => void;
  /** Волонтёр отклоняет входящий. */
  decline: (requestId: string) => void;
  /** Звонок завершён — сбрасываем состояние и отключаем сокет матчинга. */
  endCall: () => void;
  /** Волонтёр завершил звонок, но остаётся на линии — снова в пул свободных. */
  returnToLine: () => void;
  reset: () => void;
}

type CallStore = CallState & CallActions;

export const useCallStore = createStore<CallStore>('Calls', (set, get) => ({
  phase: 'idle',
  intent: null,
  match: null,
  incoming: null,
  bound: false,
  previewRole: null,

  init: () => {
    if (get().bound) {
      return;
    }
    const socket = getSocket();

    // На каждый (пере)коннект идемпотентно перезаявляем, кто мы (см. контракт §6a).
    // Важно: во время дозвона/звонка (incoming/matched) НЕ перезаявляем присутствие —
    // иначе волонтёр в разговоре снова попадёт в пул свободных.
    socket.on('connect', () => {
      const { intent, phase } = get();
      if (intent === 'volunteer' && (phase === 'volunteer-online' || phase === 'idle')) {
        socket.emit('volunteer:online');
        set((d) => {
          d.phase = 'volunteer-online';
        });
      }
      if (
        intent === 'blind' &&
        (phase === 'requesting' || phase === 'waiting' || phase === 'searching')
      ) {
        socket.emit('call:request');
      }
      // Сокет передёрнулся посреди активного звонка — просим сервер передоставить
      // матч. Раньше сервер слал его сам на каждый коннект, из-за чего свежий
      // звонок получал комнату ПРОШЛОГО (стороны разъезжались по разным комнатам).
      if (get().match && phase === 'matched') {
        socket.emit('call:resume');
      }
    });

    socket.on('call:waiting', () => {
      set((d) => {
        if (d.intent === 'blind') {
          d.phase = 'waiting';
        }
      });
    });

    socket.on('call:searching', () => {
      set((d) => {
        if (d.intent === 'blind') {
          d.phase = 'searching';
        }
      });
    });

    socket.on('call:incoming', (payload: IncomingCall) => {
      set((d) => {
        if (d.intent !== 'volunteer') {
          return;
        }
        d.incoming = payload;
        d.phase = 'incoming';
      });
    });

    socket.on('call:matched', (payload: MatchInfo) => {
      set((d) => {
        // Идемпотентность: повторный матч в ту же комнату игнорируем.
        if (d.match?.room === payload.room) {
          return;
        }
        d.match = payload;
        d.incoming = null;
        d.phase = 'matched';
      });
    });

    socket.on('call:cancelled', () => {
      set((d) => {
        d.incoming = null;
        d.phase = d.intent === 'volunteer' ? 'volunteer-online' : 'idle';
      });
    });

    set((d) => {
      d.bound = true;
    });
  },

  goOnline: () => {
    get().init();
    const socket = getSocket();
    set((d) => {
      d.intent = 'volunteer';
      d.phase = 'volunteer-online';
    });
    if (socket.connected) {
      socket.emit('volunteer:online');
    } else {
      socket.connect();
    }
  },

  goOffline: () => {
    const socket = getSocket();
    set((d) => {
      d.intent = null;
      d.phase = 'idle';
      d.incoming = null;
    });
    // Явно объявляем уход: иначе сервер ещё 12с grace держит нас в пуле
    // и шлёт звонки в мёртвый сокет (незрячий видит «волонтёр найден» впустую).
    if (socket.connected) {
      socket.emit('volunteer:offline');
    }
    socket.disconnect();
  },

  requestHelp: () => {
    get().init();
    const socket = getSocket();
    set((d) => {
      d.intent = 'blind';
      d.phase = 'requesting';
      d.match = null;
    });
    if (socket.connected) {
      socket.emit('call:request');
    } else {
      socket.connect();
    }
  },

  cancelRequest: () => {
    const socket = getSocket();
    set((d) => {
      d.intent = null;
      d.phase = 'idle';
      d.match = null;
    });
    // Явного call:cancel на бэке нет — отменяем разрывом сокета,
    // сервер почистит очередь после grace-окна (см. контракт §6).
    socket.disconnect();
  },

  accept: (requestId) => {
    getSocket().emit('call:accept', { requestId });
  },

  decline: (requestId) => {
    getSocket().emit('call:decline', { requestId });
    set((d) => {
      d.incoming = null;
      d.phase = d.intent === 'volunteer' ? 'volunteer-online' : 'idle';
    });
  },

  endCall: () => {
    const socket = getSocket();
    set((d) => {
      d.intent = null;
      d.phase = 'idle';
      d.match = null;
      d.incoming = null;
      d.previewRole = null;
    });
    socket.disconnect();
  },

  returnToLine: () => {
    const socket = getSocket();
    set((d) => {
      d.phase = 'volunteer-online';
      d.intent = 'volunteer';
      d.match = null;
      d.incoming = null;
      d.previewRole = null;
    });
    // Сокет НЕ рвём — просто снова заявляем присутствие, чтобы принимать звонки.
    if (socket.connected) {
      socket.emit('volunteer:online');
    } else {
      socket.connect();
    }
  },

  reset: () => {
    set((d) => {
      d.phase = 'idle';
      d.intent = null;
      d.match = null;
      d.incoming = null;
      d.previewRole = null;
    });
  },
}));

// ─── Dev-превью без бэка ───────────────────────────────────────────────────────
// В деве кладём стор и хелперы на window, чтобы посмотреть экраны звонка/входящего
// из консоли (см. README-подсказку). В прод-сборку этот блок не попадает.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  const w = window as unknown as Record<string, unknown>;
  w.__callStore = useCallStore;
  w.__previewIncoming = () =>
    useCallStore.setState({
      intent: 'volunteer',
      phase: 'incoming',
      incoming: { requestId: 'dev-request', blindUserId: 'dev-blind' },
    });
  w.__previewCall = (role: UserRole = 'volunteer') =>
    useCallStore.setState({
      phase: 'matched',
      previewRole: role,
      match: { url: 'wss://dev.invalid', room: 'dev-room', token: 'dev-token' },
    });
}
