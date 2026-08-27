import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Server } from 'socket.io';
import { CallsService } from './calls.service';
import {
  MATCHING_STORE,
  type ActiveRing,
  type MatchInfo,
  type MatchingStore,
  type PendingRequest,
} from './matching.store';
import { UserRole } from '../users/user-role.enum';

@Injectable()
export class MatchingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MatchingService.name);
  private server!: Server;
  private sweepTimer?: NodeJS.Timeout;

  private readonly RING_TIMEOUT_MS = 20_000;
  private readonly GRACE_MS = 12_000;
  private readonly MATCH_KEEP_SECONDS = 60;
  private readonly SWEEP_INTERVAL_MS = 1_000;

  constructor(
    private readonly calls: CallsService,
    @Inject(MATCHING_STORE) private readonly store: MatchingStore,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.store.initialize();
    await this.runSweep();
    this.sweepTimer = setInterval(
      () => void this.runSweep(),
      this.SWEEP_INTERVAL_MS,
    );
  }

  async onModuleDestroy(): Promise<void> {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
    await this.store.close();
  }

  bindServer(server: Server): void {
    this.server = server;
  }

  async isStoreReady(): Promise<boolean> {
    return this.store.isReady();
  }

  private async emitToUser(
    userId: string,
    event: string,
    payload?: unknown,
  ): Promise<void> {
    const socketId = await this.store.getOnlineSocket(userId);
    if (socketId) this.server.to(socketId).emit(event, payload);
  }

  async userConnected(userId: string, socketId: string): Promise<void> {
    await this.store.setOnlineSocket(userId, socketId);
    if (await this.store.cancelGrace(userId))
      this.logger.log(`reconnected within grace: ${userId}`);
  }

  async resume(userId: string): Promise<void> {
    const match = await this.store.getMatch(userId);
    if (match) {
      await this.emitToUser(userId, 'call:matched', match);
      this.logger.log(`match redelivered to ${userId} (${match.room})`);
    }
  }

  async volunteerOffline(volunteerId: string): Promise<void> {
    await this.store.removeAvailableVolunteer(volunteerId);
    await this.store.deleteMatch(volunteerId);
    const ring = await this.store.findRingByVolunteer(volunteerId);
    if (ring) {
      const taken = await this.store.takeRing(ring.requestId);
      if (taken) await this.retry(this.toPending(taken));
    }
    this.logger.log(`volunteer offline: ${volunteerId}`);
  }

  async userDisconnected(userId: string, socketId: string): Promise<void> {
    if ((await this.store.getOnlineSocket(userId)) !== socketId) return;
    await this.store.startGrace(userId, Date.now() + this.GRACE_MS);
    this.logger.log(`disconnect, grace started: ${userId}`);
  }

  async volunteerOnline(volunteerId: string): Promise<void> {
    await this.store.deleteMatch(volunteerId);
    await this.store.addAvailableVolunteer(volunteerId);
    this.logger.log(`volunteer online: ${volunteerId}`);
    await this.drainQueue();
  }

  async requestHelp(blindUserId: string): Promise<void> {
    await this.store.deleteMatch(blindUserId);
    if (
      (await this.store.hasPendingByBlindUser(blindUserId)) ||
      (await this.store.findRingByBlindUser(blindUserId))
    )
      return;

    const request: PendingRequest = { requestId: randomUUID(), blindUserId };
    const volunteerId = await this.store.takeAvailableVolunteer();
    if (!volunteerId) {
      await this.store.enqueuePending(request);
      await this.emitToUser(blindUserId, 'call:waiting');
      return;
    }
    await this.startRing(request, volunteerId);
  }

  async accept(requestId: string, volunteerId: string): Promise<void> {
    const ring = await this.store.getRing(requestId);
    if (!ring || ring.volunteerId !== volunteerId) return;
    const taken = await this.store.takeRing(requestId);
    if (!taken) return;

    try {
      await this.calls.ensureRoom(taken.room);
      const volunteerToken = await this.calls.createToken({
        room: taken.room,
        identity: volunteerId,
        role: UserRole.VOLUNTEER,
      });
      const blindToken = await this.calls.createToken({
        room: taken.room,
        identity: taken.blindUserId,
        role: UserRole.BLIND,
      });
      await this.deliverMatch(volunteerId, volunteerToken);
      await this.deliverMatch(taken.blindUserId, blindToken);
      this.logger.log(
        `matched ${taken.blindUserId} <-> ${volunteerId} in ${taken.room}`,
      );
    } catch (error) {
      this.logger.error(
        `accept failed for ${taken.requestId} (${taken.room}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      await this.emitToUser(volunteerId, 'call:cancelled');
      await this.emitToUser(taken.blindUserId, 'call:cancelled');
      await this.store.addAvailableVolunteer(volunteerId);
      await this.retry(this.toPending(taken));
    }
  }

  async decline(requestId: string, volunteerId: string): Promise<void> {
    const ring = await this.store.getRing(requestId);
    if (!ring || ring.volunteerId !== volunteerId) return;
    const taken = await this.store.takeRing(requestId);
    if (taken) await this.retry(this.toPending(taken));
  }

  private async deliverMatch(userId: string, match: MatchInfo): Promise<void> {
    await this.store.putMatch(userId, match, this.MATCH_KEEP_SECONDS);
    await this.emitToUser(userId, 'call:matched', match);
  }

  private async startRing(
    request: PendingRequest,
    volunteerId: string,
  ): Promise<void> {
    const ring: ActiveRing = {
      ...request,
      volunteerId,
      room: `call_${request.requestId}`,
      deadlineAt: Date.now() + this.RING_TIMEOUT_MS,
    };
    await this.store.putRing(ring);
    await this.emitToUser(volunteerId, 'call:incoming', {
      requestId: request.requestId,
      blindUserId: request.blindUserId,
    });
    await this.emitToUser(request.blindUserId, 'call:searching');
  }

  private async retry(request: PendingRequest): Promise<void> {
    const volunteerId = await this.store.takeAvailableVolunteer();
    if (!volunteerId) {
      await this.store.enqueuePending(request);
      await this.emitToUser(request.blindUserId, 'call:waiting');
      return;
    }
    await this.startRing(request, volunteerId);
  }

  private async drainQueue(): Promise<void> {
    for (;;) {
      const volunteerId = await this.store.takeAvailableVolunteer();
      if (!volunteerId) return;
      const request = await this.store.dequeuePending();
      if (!request) {
        await this.store.addAvailableVolunteer(volunteerId);
        return;
      }
      await this.startRing(request, volunteerId);
    }
  }

  private async runSweep(): Promise<void> {
    try {
      const now = Date.now();
      for (const ring of await this.store.takeExpiredRings(now)) {
        this.logger.log(`ring timeout: ${ring.requestId}`);
        await this.retry(this.toPending(ring));
      }
      for (const userId of await this.store.takeExpiredGrace(now))
        await this.purge(userId);
    } catch (error) {
      this.logger.error(
        `matching sweep failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async purge(userId: string): Promise<void> {
    await this.store.removeOnlineSocket(userId);
    await this.store.removeAvailableVolunteer(userId);
    await this.store.deleteMatch(userId);
    await this.store.removePendingByBlindUser(userId);

    const blindRing = await this.store.findRingByBlindUser(userId);
    if (blindRing) {
      const taken = await this.store.takeRing(blindRing.requestId);
      if (taken) {
        await this.emitToUser(taken.volunteerId, 'call:cancelled');
        await this.store.addAvailableVolunteer(taken.volunteerId);
      }
    }
    const volunteerRing = await this.store.findRingByVolunteer(userId);
    if (volunteerRing) {
      const taken = await this.store.takeRing(volunteerRing.requestId);
      if (taken) await this.retry(this.toPending(taken));
    }
    await this.drainQueue();
    this.logger.log(`purged: ${userId}`);
  }

  private toPending(ring: ActiveRing): PendingRequest {
    return { requestId: ring.requestId, blindUserId: ring.blindUserId };
  }
}
