import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Server, Socket } from 'socket.io';
import { MatchingService } from './matching.service';
import { UsersService } from '../users/users.service'; // ← путь/имя под своё
import { UserRole } from '../users/user-role.enum';
import type { JwtPayload } from '../../common/guards/jwt.guard'; // ← путь к твоему интерфейсу

interface SocketUser {
  id: string;
  role: UserRole;
}

@WebSocketGateway({ cors: false })
export class CallsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(CallsGateway.name);
  @WebSocketServer() server!: Server;

  constructor(
    private readonly matching: MatchingService,
    private readonly jwt: JwtService,
    private readonly users: UsersService,
  ) {}

  afterInit(server: Server): void {
    this.matching.bindServer(server);
    // Socket.IO отправляет клиенту `connect` до завершения async
    // handleConnection. Без middleware первый volunteer:online/call:request
    // мог прийти раньше, чем профиль уже положен в client.data.
    server.use((socket, next) => {
      void this.authenticate(socket)
        .then(() => next())
        .catch(() => next(new Error('Unauthorized')));
    });
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const user = this.getUser(client);
      if (!user) throw new Error('Unauthorized');
      await this.matching.userConnected(user.id, client.id);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const user = this.getUser(client);
    if (user)
      this.runCommand(
        'socket:disconnect',
        this.matching.userDisconnected(user.id, client.id),
      );
  }

  @SubscribeMessage('volunteer:online')
  onVolunteerOnline(@ConnectedSocket() client: Socket): void {
    const user = this.getUser(client);
    if (user?.role === UserRole.VOLUNTEER)
      this.runCommand(
        'volunteer:online',
        this.matching.volunteerOnline(user.id),
      );
  }

  @SubscribeMessage('volunteer:offline')
  onVolunteerOffline(@ConnectedSocket() client: Socket): void {
    const user = this.getUser(client);
    if (user?.role === UserRole.VOLUNTEER)
      this.runCommand(
        'volunteer:offline',
        this.matching.volunteerOffline(user.id),
      );
  }

  @SubscribeMessage('call:resume')
  onResume(@ConnectedSocket() client: Socket): void {
    const user = this.getUser(client);
    if (user) this.runCommand('call:resume', this.matching.resume(user.id));
  }

  @SubscribeMessage('call:request')
  onRequest(@ConnectedSocket() client: Socket): void {
    const user = this.getUser(client);
    if (user?.role === UserRole.BLIND)
      this.runCommand('call:request', this.matching.requestHelp(user.id));
  }

  @SubscribeMessage('call:accept')
  onAccept(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { requestId: string },
  ): void {
    const user = this.getUser(client);
    if (
      user?.role === UserRole.VOLUNTEER &&
      this.isRequestId(body?.requestId)
    ) {
      this.runCommand(
        'call:accept',
        this.matching.accept(body.requestId, user.id),
      );
    }
  }

  @SubscribeMessage('call:decline')
  onDecline(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { requestId: string },
  ): void {
    const user = this.getUser(client);
    if (
      user?.role === UserRole.VOLUNTEER &&
      this.isRequestId(body?.requestId)
    ) {
      this.runCommand(
        'call:decline',
        this.matching.decline(body.requestId, user.id),
      );
    }
  }

  // единственное место, где мы «приземляем» any из socket.io в типизированный объект
  private getUser(client: Socket): SocketUser | undefined {
    return (client.data as { user?: SocketUser }).user;
  }

  private setUser(client: Socket, user: SocketUser): void {
    (client.data as { user?: SocketUser }).user = user;
  }

  private async authenticate(client: Socket): Promise<void> {
    const auth = client.handshake.auth as { token?: string };
    if (!auth.token) throw new Error('Missing token');
    const payload = this.jwt.verify<JwtPayload>(auth.token);
    const user = await this.users.getProfile(payload.sub);
    this.setUser(client, { id: user.uuid, role: user.role });
  }

  private runCommand(event: string, command: Promise<void>): void {
    void command.catch((error: unknown) => {
      this.logger.error(
        `matching command ${event} failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });
  }

  private isRequestId(value: unknown): value is string {
    return (
      typeof value === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      )
    );
  }
}
