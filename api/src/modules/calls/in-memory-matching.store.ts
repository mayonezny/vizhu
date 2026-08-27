import type {
  ActiveRing,
  MatchInfo,
  MatchingStore,
  PendingRequest,
} from './matching.store';

/* Promise-returning API mirrors the asynchronous Redis implementation. */
/* eslint-disable @typescript-eslint/require-await */
/** Behavioural reference implementation used by MATCHING_BACKEND=memory. */
export class InMemoryMatchingStore implements MatchingStore {
  private readonly online = new Map<string, string>();
  private readonly available = new Set<string>();
  private readonly pending: PendingRequest[] = [];
  private readonly pendingByBlindUser = new Map<string, PendingRequest>();
  private readonly rings = new Map<string, ActiveRing>();
  private readonly ringByBlindUser = new Map<string, string>();
  private readonly ringByVolunteer = new Map<string, string>();
  private readonly grace = new Map<string, number>();
  private readonly matches = new Map<
    string,
    { match: MatchInfo; expiresAt: number }
  >();

  async initialize(): Promise<void> {}
  async close(): Promise<void> {}
  async isReady(): Promise<boolean> {
    return true;
  }

  async setOnlineSocket(userId: string, socketId: string): Promise<void> {
    this.online.set(userId, socketId);
  }
  async getOnlineSocket(userId: string): Promise<string | undefined> {
    return this.online.get(userId);
  }
  async removeOnlineSocket(userId: string, socketId?: string): Promise<void> {
    if (!socketId || this.online.get(userId) === socketId)
      this.online.delete(userId);
  }

  async addAvailableVolunteer(userId: string): Promise<void> {
    this.available.add(userId);
  }
  async removeAvailableVolunteer(userId: string): Promise<void> {
    this.available.delete(userId);
  }
  async takeAvailableVolunteer(): Promise<string | undefined> {
    const userId = this.available.values().next().value as string | undefined;
    if (userId) this.available.delete(userId);
    return userId;
  }

  async hasPendingByBlindUser(userId: string): Promise<boolean> {
    return this.pendingByBlindUser.has(userId);
  }
  async enqueuePending(request: PendingRequest): Promise<void> {
    if (this.pendingByBlindUser.has(request.blindUserId)) return;
    this.pending.push(request);
    this.pendingByBlindUser.set(request.blindUserId, request);
  }
  async dequeuePending(): Promise<PendingRequest | undefined> {
    const request = this.pending.shift();
    if (request) this.pendingByBlindUser.delete(request.blindUserId);
    return request;
  }
  async removePendingByBlindUser(userId: string): Promise<void> {
    const request = this.pendingByBlindUser.get(userId);
    if (!request) return;
    this.pendingByBlindUser.delete(userId);
    const index = this.pending.findIndex(
      (item) => item.requestId === request.requestId,
    );
    if (index >= 0) this.pending.splice(index, 1);
  }

  async getRing(requestId: string): Promise<ActiveRing | undefined> {
    return this.rings.get(requestId);
  }
  async findRingByBlindUser(userId: string): Promise<ActiveRing | undefined> {
    const requestId = this.ringByBlindUser.get(userId);
    return requestId ? this.rings.get(requestId) : undefined;
  }
  async findRingByVolunteer(userId: string): Promise<ActiveRing | undefined> {
    const requestId = this.ringByVolunteer.get(userId);
    return requestId ? this.rings.get(requestId) : undefined;
  }
  async putRing(ring: ActiveRing): Promise<void> {
    this.rings.set(ring.requestId, ring);
    this.ringByBlindUser.set(ring.blindUserId, ring.requestId);
    this.ringByVolunteer.set(ring.volunteerId, ring.requestId);
  }
  async takeRing(requestId: string): Promise<ActiveRing | undefined> {
    const ring = this.rings.get(requestId);
    if (!ring) return undefined;
    this.rings.delete(requestId);
    this.ringByBlindUser.delete(ring.blindUserId);
    this.ringByVolunteer.delete(ring.volunteerId);
    return ring;
  }
  async takeExpiredRings(now: number): Promise<ActiveRing[]> {
    const expired = [...this.rings.values()].filter(
      (ring) => ring.deadlineAt <= now,
    );
    for (const ring of expired) await this.takeRing(ring.requestId);
    return expired;
  }

  async startGrace(userId: string, deadlineAt: number): Promise<void> {
    this.grace.set(userId, deadlineAt);
  }
  async cancelGrace(userId: string): Promise<boolean> {
    return this.grace.delete(userId);
  }
  async takeExpiredGrace(now: number): Promise<string[]> {
    const expired = [...this.grace.entries()]
      .filter(([, deadlineAt]) => deadlineAt <= now)
      .map(([userId]) => userId);
    for (const userId of expired) this.grace.delete(userId);
    return expired;
  }

  async putMatch(
    userId: string,
    match: MatchInfo,
    ttlSeconds: number,
  ): Promise<void> {
    this.matches.set(userId, {
      match,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }
  async getMatch(userId: string): Promise<MatchInfo | undefined> {
    const item = this.matches.get(userId);
    if (!item) return undefined;
    if (item.expiresAt <= Date.now()) {
      this.matches.delete(userId);
      return undefined;
    }
    return item.match;
  }
  async deleteMatch(userId: string): Promise<void> {
    this.matches.delete(userId);
  }
}
