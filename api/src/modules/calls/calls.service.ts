import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AccessToken,
  RoomServiceClient,
  TrackSource,
  type VideoGrant,
} from 'livekit-server-sdk';

import { UserRole } from '../users/user-role.enum';

@Injectable()
export class CallsService {
  private readonly logger = new Logger(CallsService.name);
  private readonly roomService: RoomServiceClient;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly wsUrl: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.getOrThrow<string>('LIVEKIT_API_KEY');
    this.apiSecret = this.config.getOrThrow<string>('LIVEKIT_API_SECRET');
    this.wsUrl = this.config.getOrThrow<string>('LIVEKIT_URL'); // wss://rtc.vizhu.su — для фронта
    const host = this.config.getOrThrow<string>('LIVEKIT_HOST'); // http://livekit:7880 — внутренний
    this.roomService = new RoomServiceClient(host, this.apiKey, this.apiSecret);
  }

  /** Выпускает access-токен под конкретного юзера и роль. */
  async createToken(params: {
    room: string;
    identity: string;
    role: UserRole;
    name?: string;
    ttlSeconds?: number;
  }): Promise<{ url: string; room: string; token: string }> {
    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity: params.identity,
      name: params.name,
      ttl: params.ttlSeconds ?? 60 * 30, // 30 минут на сессию
    });

    const grant: VideoGrant = {
      room: params.room,
      roomJoin: true,
      canSubscribe: true,
      canPublish: true,
      // незрячий публикует камеру + микрофон; волонтёр — только микрофон
      canPublishSources:
        params.role === UserRole.BLIND
          ? [TrackSource.CAMERA, TrackSource.MICROPHONE]
          : [TrackSource.MICROPHONE],
    };
    at.addGrant(grant);

    return { url: this.wsUrl, room: params.room, token: await at.toJwt() };
  }

  /** Заранее создаёт комнату с лимитами (LiveKit создал бы и сам, но так мы контролируем таймаут и cap). */
  async ensureRoom(name: string): Promise<void> {
    await this.roomService.createRoom({
      name,
      emptyTimeout: 60, // закрыть пустую комнату через 60с
      // Пара + запас на переподключение. Ровно 2 ставить нельзя: при
      // реконнекте старый участник ещё числится в комнате, пока LiveKit не
      // выкинет дубль identity, и вторая сторона в этот момент упирается
      // в «room is full» и не может войти. Токены выдаются только двум
      // сведённым юзерам, так что посторонним места всё равно нет.
      maxParticipants: 3,
    });
  }

  async closeRoom(name: string): Promise<void> {
    await this.roomService.deleteRoom(name);
  }

  async removeParticipant(room: string, identity: string): Promise<void> {
    await this.roomService.removeParticipant(room, identity);
  }

  async listParticipants(room: string) {
    return this.roomService.listParticipants(room);
  }
}
