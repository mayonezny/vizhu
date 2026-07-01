import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Server } from 'socket.io';
import { CallsService } from './calls.service';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/user-role.enum';

interface PendingRequest {
  requestId: string;
  blindUserId: string;
}
interface ActiveRing {
  requestId: string;
  blindUserId: string;
  volunteerId: string;
  room: string;
  timer: NodeJS.Timeout;
}
interface MatchInfo {
  url: string;
  room: string;
  token: string;
}

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);
  private server!: Server;

  private online = new Map<string, string>(); // userId -> текущий socketId (куда слать)
  private available = new Set<string>(); // userId волонтёров, готовых принимать
  private pending: PendingRequest[] = []; // очередь незрячих
  private ringing = new Map<string, ActiveRing>(); // requestId -> активный дозвон
  private graceTimers = new Map<string, NodeJS.Timeout>(); // userId -> отложенная чистка
  private pendingMatch = new Map<string, MatchInfo>(); // userId -> матч для передоставки на реконнекте

  private readonly RING_TIMEOUT_MS = 20_000;
  private readonly GRACE_MS = 12_000; // окно на реконнект до реальной чистки
  private readonly MATCH_KEEP_MS = 60_000; // сколько держим матч для передоставки

  constructor(
    private readonly calls: CallsService,
    private readonly users: UsersService,
  ) {}

  bindServer(server: Server) {
    this.server = server;
  }

  private emitToUser(userId: string, event: string, payload?: unknown) {
    const socketId = this.online.get(userId);
    if (socketId) this.server.to(socketId).emit(event, payload);
  }

  /** Юзер (пере)подключился — вызывается gateway'ем на каждый успешный коннект. */
  userConnected(userId: string, socketId: string) {
    this.online.set(userId, socketId);
    const grace = this.graceTimers.get(userId);
    if (grace) {
      clearTimeout(grace);
      this.graceTimers.delete(userId);
      this.logger.log(`reconnected within grace: ${userId}`);
    }
    // пока отваливался — могли свести в пару; передоставляем матч на свежий сокет
    const match = this.pendingMatch.get(userId);
    if (match) this.server.to(socketId).emit('call:matched', match);
  }

  /** Сокет отвалился. НЕ чистим сразу — ждём реконнект в течение grace. */
  userDisconnected(userId: string, socketId: string) {
    if (this.online.get(userId) !== socketId) return; // устаревший сокет — уже переподключился
    if (this.graceTimers.has(userId)) return;
    const timer = setTimeout(() => this.purge(userId), this.GRACE_MS);
    this.graceTimers.set(userId, timer);
    this.logger.log(`disconnect, grace started: ${userId}`);
  }

  private purge(userId: string) {
    this.graceTimers.delete(userId);
    this.online.delete(userId);
    this.available.delete(userId);
    this.pending = this.pending.filter((p) => p.blindUserId !== userId);
    for (const ring of [...this.ringing.values()]) {
      if (ring.blindUserId === userId) {
        clearTimeout(ring.timer);
        this.ringing.delete(ring.requestId);
        this.emitToUser(ring.volunteerId, 'call:cancelled');
        this.available.add(ring.volunteerId); // волонтёр снова свободен
      } else if (ring.volunteerId === userId) {
        clearTimeout(ring.timer);
        this.ringing.delete(ring.requestId);
        this.retry({
          requestId: ring.requestId,
          blindUserId: ring.blindUserId,
        });
      }
    }
    this.drainQueue();
    this.logger.log(`purged: ${userId}`);
  }

  volunteerOnline(volunteerId: string) {
    this.available.add(volunteerId);
    this.logger.log(`volunteer online: ${volunteerId}`);
    this.drainQueue();
  }

  requestHelp(blindUserId: string) {
    // не плодим дубли (важно: на реконнекте фронт может повторно прислать call:request)
    if (this.pending.some((p) => p.blindUserId === blindUserId)) return;
    if ([...this.ringing.values()].some((r) => r.blindUserId === blindUserId))
      return;

    const req: PendingRequest = { requestId: randomUUID(), blindUserId };
    const free = this.available.values().next();
    if (free.done) {
      this.pending.push(req);
      this.emitToUser(blindUserId, 'call:waiting');
      return;
    }
    this.startRing(req, free.value);
  }

  async accept(requestId: string, volunteerId: string) {
    const ring = this.ringing.get(requestId);
    if (!ring || ring.volunteerId !== volunteerId) return;
    clearTimeout(ring.timer);
    this.ringing.delete(requestId);

    await this.calls.ensureRoom(ring.room);
    // Кладём отображаемое имя в LiveKit-токен (participant.name), чтобы каждая
    // сторона могла подписать карточку собеседника. Имя не критично — если юзер
    // не нашёлся, просто не передаём его.
    const [volunteerName, blindName] = await Promise.all([
      this.safeName(volunteerId),
      this.safeName(ring.blindUserId),
    ]);
    const volunteerTok = await this.calls.createToken({
      room: ring.room,
      identity: volunteerId,
      role: UserRole.VOLUNTEER,
      name: volunteerName,
    });
    const blindTok = await this.calls.createToken({
      room: ring.room,
      identity: ring.blindUserId,
      role: UserRole.BLIND,
      name: blindName,
    });
    this.deliverMatch(volunteerId, volunteerTok);
    this.deliverMatch(ring.blindUserId, blindTok);
    this.logger.log(
      `matched ${ring.blindUserId} <-> ${volunteerId} in ${ring.room}`,
    );
  }

  decline(requestId: string, volunteerId: string) {
    const ring = this.ringing.get(requestId);
    if (!ring || ring.volunteerId !== volunteerId) return;
    clearTimeout(ring.timer);
    this.ringing.delete(requestId);
    this.retry({ requestId: ring.requestId, blindUserId: ring.blindUserId });
  }

  private async safeName(userId: string): Promise<string | undefined> {
    try {
      const user = await this.users.getByUuid(userId);
      return user.name;
    } catch {
      return undefined;
    }
  }

  private deliverMatch(userId: string, match: MatchInfo) {
    this.pendingMatch.set(userId, match);
    this.emitToUser(userId, 'call:matched', match);
    setTimeout(() => this.pendingMatch.delete(userId), this.MATCH_KEEP_MS); // чтоб не тёк
  }

  private startRing(req: PendingRequest, volunteerId: string) {
    this.available.delete(volunteerId);
    const room = `call_${req.requestId}`;
    const timer = setTimeout(() => {
      this.ringing.delete(req.requestId);
      this.retry(req); // не ответил за таймаут — как отклонил
    }, this.RING_TIMEOUT_MS);
    this.ringing.set(req.requestId, {
      requestId: req.requestId,
      blindUserId: req.blindUserId,
      volunteerId,
      room,
      timer,
    });
    this.emitToUser(volunteerId, 'call:incoming', {
      requestId: req.requestId,
      blindUserId: req.blindUserId,
    });
    this.emitToUser(req.blindUserId, 'call:searching');
  }

  private retry(req: PendingRequest) {
    const next = this.available.values().next();
    if (next.done) {
      this.pending.unshift(req);
      this.emitToUser(req.blindUserId, 'call:waiting');
      return;
    }
    this.startRing(req, next.value);
  }

  private drainQueue() {
    while (this.pending.length && this.available.size) {
      const req = this.pending.shift()!;
      const v = this.available.values().next().value as string;
      this.startRing(req, v);
    }
  }
}
