import Redis from 'ioredis';
import { RedisMatchingStore } from './redis-matching.store';

const redisUrl = process.env.REDIS_TEST_URL;
const describeRedis = redisUrl ? describe : describe.skip;

describeRedis('RedisMatchingStore', () => {
  let store: RedisMatchingStore;
  let client: Redis;

  const clearMatchingKeys = async (): Promise<void> => {
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
    client = new Redis(redisUrl!);
    await clearMatchingKeys();
  });

  beforeEach(async () => {
    await clearMatchingKeys();
    store = new RedisMatchingStore(redisUrl!);
    await store.initialize();
  });

  afterEach(async () => {
    await store.close();
  });

  afterAll(async () => {
    await clearMatchingKeys();
    await client.quit();
  });

  it('keeps pending requests FIFO and deduplicates a blind user', async () => {
    await store.enqueuePending({ requestId: 'first', blindUserId: 'blind-1' });
    await store.enqueuePending({
      requestId: 'duplicate',
      blindUserId: 'blind-1',
    });
    await store.enqueuePending({ requestId: 'second', blindUserId: 'blind-2' });

    await expect(store.dequeuePending()).resolves.toEqual({
      requestId: 'first',
      blindUserId: 'blind-1',
    });
    await expect(store.dequeuePending()).resolves.toEqual({
      requestId: 'second',
      blindUserId: 'blind-2',
    });
  });

  it('processes expired ring and grace records once', async () => {
    await store.putRing({
      requestId: 'ring-1',
      blindUserId: 'blind-1',
      volunteerId: 'volunteer-1',
      room: 'call_ring-1',
      deadlineAt: 1,
    });
    await store.startGrace('blind-1', 1);

    await expect(store.takeExpiredRings(Date.now())).resolves.toHaveLength(1);
    await expect(store.takeExpiredRings(Date.now())).resolves.toEqual([]);
    await expect(store.takeExpiredGrace(Date.now())).resolves.toEqual([
      'blind-1',
    ]);
    await expect(store.takeExpiredGrace(Date.now())).resolves.toEqual([]);
  });

  it('expires match data with Redis TTL', async () => {
    await store.putMatch(
      'blind-1',
      { url: 'wss://rtc', room: 'room', token: 'secret' },
      1,
    );
    await expect(store.getMatch('blind-1')).resolves.toBeDefined();
    await new Promise((resolve) => setTimeout(resolve, 1_100));
    await expect(store.getMatch('blind-1')).resolves.toBeUndefined();
  });
});
