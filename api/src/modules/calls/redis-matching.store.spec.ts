import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from '@jest/globals';
import Redis from 'ioredis';
import { createConnection } from 'node:net';
import { RedisMatchingStore } from './redis-matching.store';

const redisUrl = process.env.REDIS_TEST_URL;
const describeRedis = redisUrl ? describe : describe.skip;

const assertRedisEndpointReachable = async (url: string): Promise<void> => {
  const parsedUrl = new URL(url);
  const port = Number(parsedUrl.port || 6379);

  await new Promise<void>((resolve, reject) => {
    const socket = createConnection({ host: parsedUrl.hostname, port });
    const fail = (error: Error): void => {
      socket.destroy();
      reject(error);
    };

    socket.setTimeout(1_000, () =>
      fail(new Error(`Connection timed out after 1000 ms`)),
    );
    socket.once('error', fail);
    socket.once('connect', () => {
      socket.removeAllListeners();
      socket.end();
      resolve();
    });
  });
};

describeRedis('RedisMatchingStore', () => {
  let store: RedisMatchingStore | undefined;
  let client: Redis | undefined;

  const clearMatchingKeys = async (): Promise<void> => {
    if (!client) return;

    let cursor = '0';
    do {
      const [nextCursor, found] = await client.scan(
        cursor,
        'MATCH',
        'matching:v1:*',
        'COUNT',
        '100',
      );
      cursor = nextCursor;
      if (found.length) await client.del(...found);
    } while (cursor !== '0');
  };

  beforeAll(async () => {
    try {
      await assertRedisEndpointReachable(redisUrl!);
      client = new Redis(redisUrl!, {
        lazyConnect: true,
        connectTimeout: 1_000,
        maxRetriesPerRequest: 0,
        enableOfflineQueue: false,
        retryStrategy: () => null,
      });
      client.on('error', () => undefined);
      await client.connect();
      await client.ping();
      await clearMatchingKeys();
    } catch (error) {
      client?.disconnect(false);
      client?.removeAllListeners();
      client = undefined;
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Redis integration tests require a reachable REDIS_TEST_URL (${redisUrl}): ${message}`,
      );
    }
  });

  beforeEach(async () => {
    await clearMatchingKeys();
    store = new RedisMatchingStore(redisUrl!);
    await store.initialize();
  });

  afterEach(async () => {
    if (!store) return;
    const currentStore = store;
    store = undefined;
    await currentStore.close();
  });

  afterAll(async () => {
    if (!client) return;
    const currentClient = client;
    try {
      await clearMatchingKeys();
      if (currentClient.status === 'ready') await currentClient.quit();
    } finally {
      currentClient.disconnect(false);
      currentClient.removeAllListeners();
      client = undefined;
    }
  });

  it('keeps pending requests FIFO and deduplicates a blind user', async () => {
    await store!.enqueuePending({
      requestId: 'first',
      blindUserId: 'blind-1',
    });
    await store!.enqueuePending({
      requestId: 'duplicate',
      blindUserId: 'blind-1',
    });
    await store!.enqueuePending({
      requestId: 'second',
      blindUserId: 'blind-2',
    });

    await expect(store!.dequeuePending()).resolves.toEqual({
      requestId: 'first',
      blindUserId: 'blind-1',
    });
    await expect(store!.dequeuePending()).resolves.toEqual({
      requestId: 'second',
      blindUserId: 'blind-2',
    });
  });

  it('processes expired ring and grace records once', async () => {
    await store!.putRing({
      requestId: 'ring-1',
      blindUserId: 'blind-1',
      volunteerId: 'volunteer-1',
      room: 'call_ring-1',
      deadlineAt: 1,
    });
    await store!.startGrace('blind-1', 1);

    await expect(store!.takeExpiredRings(Date.now())).resolves.toHaveLength(1);
    await expect(store!.takeExpiredRings(Date.now())).resolves.toEqual([]);
    await expect(store!.takeExpiredGrace(Date.now())).resolves.toEqual([
      'blind-1',
    ]);
    await expect(store!.takeExpiredGrace(Date.now())).resolves.toEqual([]);
  });

  it('lets exactly one concurrent consumer take a ring', async () => {
    await store!.putRing({
      requestId: 'ring-atomic',
      blindUserId: 'blind-1',
      volunteerId: 'volunteer-1',
      room: 'call_ring-atomic',
      deadlineAt: Date.now() + 10_000,
    });

    const results = await Promise.all([
      store!.takeRing('ring-atomic'),
      store!.takeRing('ring-atomic'),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it('does not remove a newer socket on an old socket disconnect', async () => {
    await store!.setOnlineSocket('volunteer-1', 'new-socket');
    await store!.removeOnlineSocket('volunteer-1', 'old-socket');

    await expect(store!.getOnlineSocket('volunteer-1')).resolves.toBe(
      'new-socket',
    );
  });

  it('expires match data with Redis TTL', async () => {
    await store!.putMatch(
      'blind-1',
      { url: 'wss://rtc', room: 'room', token: 'secret' },
      1,
    );
    await expect(store!.getMatch('blind-1')).resolves.toBeDefined();
    await new Promise((resolve) => setTimeout(resolve, 1_100));
    await expect(store!.getMatch('blind-1')).resolves.toBeUndefined();
  });
});
