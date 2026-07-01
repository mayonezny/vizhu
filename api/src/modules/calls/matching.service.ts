import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Server } from 'socket.io';
import { CallsService } from './calls.service';
import { UserRole } from '../users/user-role.enum';

interface PendingRequest {
  requestId: string;
  blindUserId: string;
  blindSocketId: string;
}
interface ActiveRing {
  requestId: string;
  blindUserId: string;
  blindSocketId: string;
  volunteerId: string;
  volunteerSocketId: string;
  room: string;
  timer: NodeJS.Timeout;
}

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);
  private server!: Server;
  //ЗАМЕНИТЬ НА REDIS ! ! !
  private available = new Map<string, string>(); // volunteerId -> socketId (готов принимать)
  private pending: PendingRequest[] = []; // очередь незрячих
  private ringing = new Map<string, ActiveRing>(); // requestId -> звоним волонтёру, ждём accept

  private readonly RING_TIMEOUT_MS = 20_000;

  constructor(private readonly calls: CallsService) {}

  bindServer(server: Server) {
    this.server = server;
  }
  private emit(socketId: string, event: string, payload?: any) {
    this.server.to(socketId).emit(event, payload);
  }

  /** Волонтёр включил готовность принимать звонки. */
  volunteerOnline(volunteerId: string, socketId: string) {
    this.available.set(volunteerId, socketId);
    this.logger.log(`volunteer online: ${volunteerId}`);
    this.drainQueue(); // вдруг кто-то уже ждёт
  }

  /** Незрячий просит помощь. */
  requestHelp(blindUserId: string, blindSocketId: string) {
    const requestId = randomUUID();
    const req: PendingRequest = { requestId, blindUserId, blindSocketId };
    const free = this.available.keys().next();
    if (free.done) {
      this.pending.push(req);
      this.emit(blindSocketId, 'call:waiting'); // волонтёров нет — ждём
      return;
    }
    this.startRing(req, free.value, this.available.get(free.value)!);
  }

  /** Волонтёр принял звонок → сводим обоих. */
  async accept(requestId: string, volunteerId: string) {
    const ring = this.ringing.get(requestId);
    if (!ring || ring.volunteerId !== volunteerId) return;
    clearTimeout(ring.timer);
    this.ringing.delete(requestId);

    await this.calls.ensureRoom(ring.room);
    const volunteerTok = await this.calls.createToken({
      room: ring.room,
      identity: volunteerId,
      role: UserRole.VOLUNTEER,
    });
    const blindTok = await this.calls.createToken({
      room: ring.room,
      identity: ring.blindUserId,
      role: UserRole.BLIND,
    });
    this.emit(ring.volunteerSocketId, 'call:matched', volunteerTok);
    this.emit(ring.blindSocketId, 'call:matched', blindTok);
    this.logger.log(
      `matched ${ring.blindUserId} <-> ${volunteerId} in ${ring.room}`,
    );
  }

  /** Волонтёр отклонил → пробуем следующего. */
  decline(requestId: string, volunteerId: string) {
    const ring = this.ringing.get(requestId);
    if (!ring || ring.volunteerId !== volunteerId) return;
    clearTimeout(ring.timer);
    this.ringing.delete(requestId);
    this.retry(ring); // назад в поиск, но уже без этого волонтёра
  }

  /** Отвал сокета — чистим за собой. */
  handleDisconnect(userId: string, socketId: string) {
    if (this.available.get(userId) === socketId) this.available.delete(userId);
    this.pending = this.pending.filter((p) => p.blindSocketId !== socketId);
    for (const ring of this.ringing.values()) {
      if (ring.blindSocketId === socketId) {
        // незрячий ушёл — отменяем звонок волонтёру
        clearTimeout(ring.timer);
        this.ringing.delete(ring.requestId);
        this.emit(ring.volunteerSocketId, 'call:cancelled');
      } else if (ring.volunteerSocketId === socketId) {
        // волонтёр отвалился — ищем другого
        clearTimeout(ring.timer);
        this.ringing.delete(ring.requestId);
        this.retry(ring);
      }
    }
  }

  private startRing(
    req: PendingRequest,
    volunteerId: string,
    volunteerSocketId: string,
  ) {
    this.available.delete(volunteerId); // занят, пока звоним
    const room = `call_${req.requestId}`;
    const timer = setTimeout(() => {
      // не принял за таймаут — как отклонил
      this.ringing.delete(req.requestId);
      this.retry({ ...ring });
    }, this.RING_TIMEOUT_MS);
    const ring: ActiveRing = {
      requestId: req.requestId,
      blindUserId: req.blindUserId,
      blindSocketId: req.blindSocketId,
      volunteerId,
      volunteerSocketId,
      room,
      timer,
    };
    this.ringing.set(req.requestId, ring);
    this.emit(volunteerSocketId, 'call:incoming', {
      requestId: req.requestId,
      blindUserId: req.blindUserId,
    });
    this.emit(req.blindSocketId, 'call:searching'); // нашли кандидата, звоним ему
  }

  /** Вернуть заявку в поиск, попробовать другого свободного волонтёра. */
  private retry(ring: ActiveRing) {
    const req: PendingRequest = {
      requestId: ring.requestId,
      blindUserId: ring.blindUserId,
      blindSocketId: ring.blindSocketId,
    };
    const next = this.available.keys().next();
    if (next.done) {
      this.pending.unshift(req); // никого нет — в начало очереди
      this.emit(req.blindSocketId, 'call:waiting');
      return;
    }
    this.startRing(req, next.value, this.available.get(next.value)!);
  }

  private drainQueue() {
    while (this.pending.length && this.available.size) {
      const req = this.pending.shift()!;
      const v = this.available.keys().next().value as string;
      this.startRing(req, v, this.available.get(v)!);
    }
  }
}
