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
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const auth = client.handshake.auth as { token?: string };
      const token = auth.token;
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwt.verify<JwtPayload>(token);
      const user = await this.users.getProfile(payload.sub);
      this.setUser(client, { id: user.uuid, role: user.role });
      this.matching.userConnected(user.uuid, client.id); // ← было: ничего
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const user = this.getUser(client);
    if (user) this.matching.userDisconnected(user.id, client.id); // ← было: handleDisconnect
  }

  @SubscribeMessage('volunteer:online')
  onVolunteerOnline(@ConnectedSocket() client: Socket): void {
    const user = this.getUser(client);
    if (user?.role === UserRole.VOLUNTEER)
      this.matching.volunteerOnline(user.id); // без socketId
  }

  @SubscribeMessage('volunteer:offline')
  onVolunteerOffline(@ConnectedSocket() client: Socket): void {
    const user = this.getUser(client);
    if (user?.role === UserRole.VOLUNTEER)
      this.matching.volunteerOffline(user.id);
  }

  @SubscribeMessage('call:resume')
  onResume(@ConnectedSocket() client: Socket): void {
    const user = this.getUser(client);
    if (user) this.matching.resume(user.id);
  }

  @SubscribeMessage('call:request')
  onRequest(@ConnectedSocket() client: Socket): void {
    const user = this.getUser(client);
    if (user?.role === UserRole.BLIND) this.matching.requestHelp(user.id); // без socketId
  }

  @SubscribeMessage('call:accept')
  onAccept(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { requestId: string },
  ): void {
    const user = this.getUser(client);
    if (user) void this.matching.accept(body.requestId, user.id); // void — promise осознанно не ждём
  }

  @SubscribeMessage('call:decline')
  onDecline(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { requestId: string },
  ): void {
    const user = this.getUser(client);
    if (user) this.matching.decline(body.requestId, user.id);
  }

  // единственное место, где мы «приземляем» any из socket.io в типизированный объект
  private getUser(client: Socket): SocketUser | undefined {
    return (client.data as { user?: SocketUser }).user;
  }

  private setUser(client: Socket, user: SocketUser): void {
    (client.data as { user?: SocketUser }).user = user;
  }
}
