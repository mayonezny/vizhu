import { InMemoryMatchingStore } from './in-memory-matching.store';
import { MatchingService } from './matching.service';

describe('MatchingService', () => {
  it('matches a blind user and a volunteer without changing socket events', async () => {
    const emitted: Array<{
      socketId: string;
      event: string;
      payload: unknown;
    }> = [];
    const server = {
      to: (socketId: string) => ({
        emit: (event: string, payload: unknown) =>
          emitted.push({ socketId, event, payload }),
      }),
    };
    const calls = {
      ensureRoom: jest.fn().mockResolvedValue(undefined),
      createToken: jest
        .fn()
        .mockImplementation(
          ({ room, identity }: { room: string; identity: string }) =>
            Promise.resolve({
              url: 'wss://rtc.vizhu.su',
              room,
              token: `token-for-${identity}`,
            }),
        ),
    };
    const matching = new MatchingService(
      calls as never,
      new InMemoryMatchingStore(),
    );
    matching.bindServer(server as never);
    await matching.onModuleInit();

    await matching.userConnected('volunteer', 'socket-volunteer');
    await matching.volunteerOnline('volunteer');
    await matching.userConnected('blind', 'socket-blind');
    await matching.requestHelp('blind');

    const incoming = emitted.find(
      (item) =>
        item.socketId === 'socket-volunteer' && item.event === 'call:incoming',
    );
    expect(incoming?.payload).toMatchObject({ blindUserId: 'blind' });

    await matching.accept(
      (incoming?.payload as { requestId: string }).requestId,
      'volunteer',
    );

    const matches = emitted.filter((item) => item.event === 'call:matched');
    expect(matches).toHaveLength(2);
    expect(matches.map((item) => item.socketId).sort()).toEqual([
      'socket-blind',
      'socket-volunteer',
    ]);
    expect((matches[0].payload as { room: string }).room).toBe(
      (matches[1].payload as { room: string }).room,
    );
    expect(calls.ensureRoom).toHaveBeenCalledTimes(1);
    await matching.onModuleDestroy();
  });
});
