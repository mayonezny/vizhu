import type { UserRole } from '@/features/profile';

/** Данные для входа в LiveKit-комнату (приходят в call:matched или /calls/token). */
export type MatchInfo = {
  url: string;
  room: string;
  token: string;
};

/** Входящий звонок для волонтёра (событие call:incoming). */
export type IncomingCall = {
  requestId: string;
  blindUserId: string;
};

/**
 * Фаза матчинга — единый конечный автомат для обеих ролей.
 *
 * - idle             — ничего не происходит
 * - volunteer-online — волонтёр встал на линию, ждёт звонки
 * - requesting       — незрячий отправил call:request, ждём ответ сервера
 * - waiting          — незрячий в очереди (свободных волонтёров нет)
 * - searching        — незрячий: волонтёр найден, идёт дозвон
 * - incoming         — волонтёр: входящий звонок
 * - matched          — пара сведена, есть данные для входа в LiveKit
 */
export type CallPhase =
  | 'idle'
  | 'volunteer-online'
  | 'requesting'
  | 'waiting'
  | 'searching'
  | 'incoming'
  | 'matched';

export type CallIntent = UserRole | null;
