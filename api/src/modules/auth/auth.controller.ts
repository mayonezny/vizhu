import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';

interface SendOtpBody {
  phone?: string;
}

interface VerifyOtpBody {
  phone?: string;
  code?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  async sendOtp(@Body() body: SendOtpBody) {
    const phone = body.phone;
    if (typeof phone !== 'string' || !/^[\d+\-()\s]+$/.test(phone)) {
      throw new BadRequestException('Неверный формат номера телефона');
    }
    await this.auth.sendOtp(phone);
    return { message: 'Код отправлен' };
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() body: VerifyOtpBody) {
    const { phone, code } = body;
    if (typeof phone !== 'string' || phone.trim() === '') {
      throw new BadRequestException('Укажите номер телефона');
    }
    if (typeof code !== 'string' || !/^\d{4}$/.test(code)) {
      throw new BadRequestException('Код должен быть 4 цифры');
    }
    return this.auth.verifyOtp(phone, code);
  }
}
