import Redis from 'ioredis';
import type {
  ActiveRing,
  MatchInfo,
  MatchingStore,
  PendingRequest,
} from './matching.store';

const PREFIX = 'matching:v1';
const keys = {
  online: `${PREFIX}:online`,
  available: `${PREFIX}:available`,
  pending: `${PREFIX}:pending`,
  pendingByBlind: `${PREFIX}:pending:by-blind`,
  pendingItem: (requestId: string) => `${PREFIX}:pending:item:${requestId}`,
  ring: (requestId: string) => `${PREFIX}:ring:${requestId}`,
  ringByBlind: `${PREFIX}:ring:by-blind`,
  ringByVolunteer: `${PREFIX}:ring:by-volunteer`,
  ringDeadlines: `${PREFIX}:ring:deadlines`,
  grace: (userId: string) => `${PREFIX}:grace:${userId}`,
  graceDeadlines: `${PREFIX}:grace:deadlines`,
  match: (userId: string) => `${PREFIX}:match:${userId}`,
};

/** Redis representation of matching state. All matching keys use matching:v1. */
export class RedisMatchingStore implements MatchingStore {
  private readonly client: Redis;
  private initialized = false;

  constructor(url: string) {
    this.client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.client.connect();
    await this.client.ping();
    this.initialized = true;
  }

  async close(): Promise<void> {
    if (this.client.status !== 'end') await this.client.quit();
    this.initialized = false;
  }

  async isReady(): Promise<boolean> {
    if (!this.initialized) return false;
    try {
      return (await this.client.ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  async setOnlineSocket(userId: string, socketId: string): Promise<void> {
    await this.client.hset(keys.online, userId, socketId);
  }
  async getOnlineSocket(userId: string): Promise<string | undefined> {
    return (await this.client.hget(keys.online, userId)) ?? undefined;
  }
  async removeOnlineSocket(userId: string, socketId?: string): Promise<void> {
    if (!socketId || (await this.getOnlineSocket(userId)) === socketId) {
      await this.client.hdel(keys.online, userId);
    }
  }

  async addAvailableVolunteer(userId: string): Promise<void> {
    await this.client.sadd(keys.available, userId);
  }
  async removeAvailableVolunteer(userId: string): Promise<void> {
    await this.client.srem(keys.available, userId);
  }
  async takeAvailableVolunteer(): Promise<string | undefined> {
    return (await this.client.spop(keys.available)) ?? undefined;
  }

  async hasPendingByBlindUser(userId: string): Promise<boolean> {
    return (await this.client.hexists(keys.pendingByBlind, userId)) === 1;
  }
  async enqueuePending(request: PendingRequest): Promise<void> {
    if (await this.hasPendingByBlindUser(request.blindUserId)) return;
    await this.client
      .multi()
      .set(keys.pendingItem(request.requestId), JSON.stringify(request))
      .hset(keys.pendingByBlind, request.blindUserId, request.requestId)
      .lpush(keys.pending, request.requestId)
      .exec();
  }
  async dequeuePending(): Promise<PendingRequest | undefined> {
    for (;;) {
      const requestId = await this.client.rpop(keys.pending);
      if (!requestId) return undefined;
      const raw = await this.client.get(keys.pendingItem(requestId));
      await this.client.del(keys.pendingItem(requestId));
      if (!raw) continue;
      const request = this.parse<PendingRequest>(
        raw,
        keys.pendingItem(requestId),
      );
      await this.client.hdel(keys.pendingByBlind, request.blindUserId);
      return request;
    }
  }
  async removePendingByBlindUser(userId: string): Promise<void> {
    const requestId = await this.client.hget(keys.pendingByBlind, userId);
    if (!requestId) return;
    await this.client
      .multi()
      .hdel(keys.pendingByBlind, userId)
      .lrem(keys.pending, 0, requestId)
      .del(keys.pendingItem(requestId))
      .exec();
  }

  async getRing(requestId: string): Promise<ActiveRing | undefined> {
    const raw = await this.client.get(keys.ring(requestId));
    return raw ? this.parse<ActiveRing>(raw, keys.ring(requestId)) : undefined;
  }
  async findRingByBlindUser(userId: string): Promise<ActiveRing | undefined> {
    const requestId = await this.client.hget(keys.ringByBlind, userId);
    return requestId ? this.getRing(requestId) : undefined;
  }
  async findRingByVolunteer(userId: string): Promise<ActiveRing | undefined> {
    const requestId = await this.client.hget(keys.ringByVolunteer, userId);
    return requestId ? this.getRing(requestId) : undefined;
  }
  async putRing(ring: ActiveRing): Promise<void> {
    await this.client
      .multi()
      .set(keys.ring(ring.requestId), JSON.stringify(ring))
      .hset(keys.ringByBlind, ring.blindUserId, ring.requestId)
      .hset(keys.ringByVolunteer, ring.volunteerId, ring.requestId)
      .zadd(keys.ringDeadlines, ring.deadlineAt, ring.requestId)
      .exec();
  }
  async takeRing(requestId: string): Promise<ActiveRing | undefined> {
    const ring = await this.getRing(requestId);
    if (!ring) return undefined;
    await this.client
      .multi()
      .del(keys.ring(requestId))
      .hdel(keys.ringByBlind, ring.blindUserId)
      .hdel(keys.ringByVolunteer, ring.volunteerId)
      .zrem(keys.ringDeadlines, requestId)
      .exec();
    return ring;
  }
  async takeExpiredRings(now: number): Promise<ActiveRing[]> {
    const requestIds = await this.client.zrangebyscore(
      keys.ringDeadlines,
      0,
      now,
    );
    const rings: ActiveRing[] = [];
    for (const requestId of requestIds) {
      if ((await this.client.zrem(keys.ringDeadlines, requestId)) !== 1)
        continue;
      const ring = await this.takeRing(requestId);
      if (ring) rings.push(ring);
    }
    return rings;
  }

  async startGrace(userId: string, deadlineAt: number): Promise<void> {
    const ttlSeconds = Math.max(1, Math.ceil((deadlineAt - Date.now()) / 1000));
    await this.client
      .multi()
      .set(keys.grace(userId), String(deadlineAt), 'EX', ttlSeconds)
      .zadd(keys.graceDeadlines, deadlineAt, userId)
      .exec();
  }
  async cancelGrace(userId: string): Promise<boolean> {
    const removed = await this.client.zrem(keys.graceDeadlines, userId);
    await this.client.del(keys.grace(userId));
    return removed === 1;
  }
  async takeExpiredGrace(now: number): Promise<string[]> {
    const userIds = await this.client.zrangebyscore(
      keys.graceDeadlines,
      0,
      now,
    );
    const expired: string[] = [];
    for (const userId of userIds) {
      if ((await this.client.zrem(keys.graceDeadlines, userId)) === 1) {
        await this.client.del(keys.grace(userId));
        expired.push(userId);
      }
    }
    return expired;
  }

  async putMatch(
    userId: string,
    match: MatchInfo,
    ttlSeconds: number,
  ): Promise<void> {
    await this.client.set(
      keys.match(userId),
      JSON.stringify(match),
      'EX',
      ttlSeconds,
    );
  }
  async getMatch(userId: string): Promise<MatchInfo | undefined> {
    const raw = await this.client.get(keys.match(userId));
    return raw ? this.parse<MatchInfo>(raw, keys.match(userId)) : undefined;
  }
  async deleteMatch(userId: string): Promise<void> {
    await this.client.del(keys.match(userId));
  }

  private parse<T>(raw: string, key: string): T {
    try {
      return JSON.parse(raw) as T;
    } catch {
      throw new Error(`Invalid JSON in Redis key ${key}`);
    }
  }
}
