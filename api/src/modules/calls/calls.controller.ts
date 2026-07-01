import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { CallsService } from './calls.service';
import { CreateTokenDto } from './dto/create-token.dto';
import { JwtAuthGuard } from '../../common/guards/jwt.guard'; // ← поправь путь под свой
import { JwtPayload } from '../../common/guards/jwt.guard'; // ← путь к твоему интерфейсу

@Controller('calls')
@UseGuards(JwtAuthGuard)
export class CallsController {
  constructor(private readonly calls: CallsService) {}

  @Post('token')
  async getToken(
    @Req() req: Request & { user: JwtPayload },
    @Body() dto: CreateTokenDto,
  ) {
    const userId = req.user.sub;
    await this.calls.ensureRoom(dto.room);
    return this.calls.createToken({
      room: dto.room,
      identity: userId,
      role: dto.role,
    });
  }
}
