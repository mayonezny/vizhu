import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { InMemoryMatchingStore } from './in-memory-matching.store';

describe('InMemoryMatchingStore', () => {
  let store: InMemoryMatchingStore;

  beforeEach(() => {
    store = new InMemoryMatchingStore();
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
    await expect(store.dequeuePending()).resolves.toBeUndefined();
  });

  it('returns each expired ring and grace user only once', async () => {
    await store.putRing({
      requestId: 'ring-1',
      blindUserId: 'blind-1',
      volunteerId: 'volunteer-1',
      room: 'call_ring-1',
      deadlineAt: 10,
    });
    await store.startGrace('blind-1', 10);

    await expect(store.takeExpiredRings(10)).resolves.toHaveLength(1);
    await expect(store.takeExpiredRings(10)).resolves.toEqual([]);
    await expect(store.takeExpiredGrace(10)).resolves.toEqual(['blind-1']);
    await expect(store.takeExpiredGrace(10)).resolves.toEqual([]);
  });

  it('expires a re-delivered match', async () => {
    jest.useFakeTimers();
    await store.putMatch(
      'blind-1',
      { url: 'wss://rtc', room: 'room', token: 'secret' },
      60,
    );
    await expect(store.getMatch('blind-1')).resolves.toEqual({
      url: 'wss://rtc',
      room: 'room',
      token: 'secret',
    });

    jest.advanceTimersByTime(60_000);
    await expect(store.getMatch('blind-1')).resolves.toBeUndefined();
    jest.useRealTimers();
  });
});
