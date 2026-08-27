export interface PendingRequest {
  requestId: string;
  blindUserId: string;
}

export interface ActiveRing extends PendingRequest {
  volunteerId: string;
  room: string;
  deadlineAt: number;
}

export interface MatchInfo {
  url: string;
  room: string;
  token: string;
}

/** Injection token for the selected matching-state backend. */
export const MATCHING_STORE = Symbol('MATCHING_STORE');

/**
 * State operations are deliberately phrased as matching operations, rather
 * than Redis commands. This keeps MatchingService independent from storage.
 */
export interface MatchingStore {
  initialize(): Promise<void>;
  close(): Promise<void>;
  isReady(): Promise<boolean>;

  setOnlineSocket(userId: string, socketId: string): Promise<void>;
  getOnlineSocket(userId: string): Promise<string | undefined>;
  removeOnlineSocket(userId: string, socketId?: string): Promise<void>;

  addAvailableVolunteer(userId: string): Promise<void>;
  removeAvailableVolunteer(userId: string): Promise<void>;
  takeAvailableVolunteer(): Promise<string | undefined>;

  hasPendingByBlindUser(userId: string): Promise<boolean>;
  enqueuePending(request: PendingRequest): Promise<void>;
  dequeuePending(): Promise<PendingRequest | undefined>;
  removePendingByBlindUser(userId: string): Promise<void>;

  getRing(requestId: string): Promise<ActiveRing | undefined>;
  findRingByBlindUser(userId: string): Promise<ActiveRing | undefined>;
  findRingByVolunteer(userId: string): Promise<ActiveRing | undefined>;
  putRing(ring: ActiveRing): Promise<void>;
  takeRing(requestId: string): Promise<ActiveRing | undefined>;
  takeExpiredRings(now: number): Promise<ActiveRing[]>;

  startGrace(userId: string, deadlineAt: number): Promise<void>;
  cancelGrace(userId: string): Promise<boolean>;
  takeExpiredGrace(now: number): Promise<string[]>;

  putMatch(userId: string, match: MatchInfo, ttlSeconds: number): Promise<void>;
  getMatch(userId: string): Promise<MatchInfo | undefined>;
  deleteMatch(userId: string): Promise<void>;
}
