import { io, type Socket } from 'socket.io-client';

import { getAccessToken } from '@/shared/api/token-store';
import { env } from '@/shared/config';

/**
 * Singleton Socket.IO-клиента матчинга.
 *
 * - `autoConnect: false` — подключаемся вручную, когда появляется намерение
 *   (встать на линию / позвать помощь).
 * - `auth` как функция — socket.io дёргает её на каждый (пере)коннект, поэтому
 *   всегда уходит свежий auth-JWT (важно после refresh токена).
 * - reconnection включён по умолчанию — восстановление статуса делаем сами
 *   на событии `connect` (см. call.store).
 */
let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(env.socketUrl, {
      autoConnect: false,
      transports: ['websocket'],
      auth: (cb) => cb({ token: getAccessToken() ?? '' }),
    });
  }
  return socket;
};
