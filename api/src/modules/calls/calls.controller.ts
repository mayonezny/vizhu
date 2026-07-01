import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { CallsService } from './calls.service';
import { CreateTokenDto } from './dto/create-token.dto';
import { JwtAuthGuard } from '../../common/guards/jwt.guard'; // ← поправь путь под свой
import { JwtPayload } from '../../common/guards/jwt.guard'; // ← путь к твоему интерфейсу
import { UsersService } from '../users/users.service';

@Controller('calls')
@UseGuards(JwtAuthGuard)
export class CallsController {
  constructor(
    private readonly calls: CallsService,
    private readonly users: UsersService,
  ) {}

  @Post('token')
  async getToken(
    @Req() req: Request & { user: JwtPayload },
    @Body() dto: CreateTokenDto,
  ) {
    await this.calls.ensureRoom(dto.room);
    const user = await this.users.getProfile(req.user.sub);
    return this.calls.createToken({
      room: dto.room,
      identity: user.uuid,
      role: user.role,
    });
  }
}
