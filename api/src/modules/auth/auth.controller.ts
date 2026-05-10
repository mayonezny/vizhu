import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiProperty,
  ApiResponse,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { AuthService, REFRESH_COOKIE } from './auth.service';

// Локальные интерфейсы — избегаем конфликта nodenext с FastifyRequest/Reply
interface CookieRequest {
  cookies?: Record<string, string | undefined>;
}

interface CookieReply {
  setCookie(
    name: string,
    value: string,
    options?: Record<string, unknown>,
  ): void;
  clearCookie(name: string, options?: Record<string, unknown>): void;
}

const COOKIE_OPTIONS: Record<string, unknown> = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/auth',
  maxAge: 30 * 24 * 60 * 60,
};

class SendOtpBody {
  @ApiProperty({
    example: '79001234567',
    description:
      'Номер телефона. Принимается любой формат: 79001234567, +7(900)123-45-67, 8-900-123-45-67',
  })
  phone?: unknown;
}

class VerifyOtpBody {
  @ApiProperty({
    example: '79001234567',
    description: 'Номер телефона в любом формате',
  })
  phone?: unknown;

  @ApiProperty({ example: '1234', description: '4-значный код из звонка' })
  code?: unknown;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Запросить голосовой OTP-звонок' })
  @ApiBody({ type: SendOtpBody })
  @ApiResponse({ status: 200, description: 'Звонок инициирован' })
  @ApiResponse({ status: 400, description: 'Неверный формат номера' })
  async sendOtp(@Body() body: SendOtpBody) {
    const { phone } = body;
    if (typeof phone !== 'string' || !/^[\d+\-()\s]+$/.test(phone)) {
      throw new BadRequestException('Неверный формат номера телефона');
    }
    await this.auth.sendOtp(phone);
    return { message: 'Код отправлен' };
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Подтвердить код. Возвращает accessToken + ставит refresh cookie',
  })
  @ApiBody({ type: VerifyOtpBody })
  @ApiResponse({ status: 200, description: '{ accessToken, isNewUser }' })
  @ApiResponse({ status: 400, description: 'Неверный или истёкший код' })
  async verifyOtp(
    @Body() body: VerifyOtpBody,
    @Res({ passthrough: true }) res: CookieReply,
  ) {
    const { phone, code } = body;
    if (typeof phone !== 'string' || phone.trim() === '') {
      throw new BadRequestException('Укажите номер телефона');
    }
    if (typeof code !== 'string' || !/^\d{4}$/.test(code)) {
      throw new BadRequestException('Код должен быть 4 цифры');
    }

    const result = await this.auth.verifyOtp(phone, code);
    res.setCookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);
    return { accessToken: result.accessToken, isNewUser: result.isNewUser };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Обновить accessToken по refresh cookie' })
  @ApiCookieAuth(REFRESH_COOKIE)
  @ApiResponse({ status: 200, description: '{ accessToken }' })
  @ApiResponse({ status: 401, description: 'Refresh token недействителен' })
  async refresh(
    @Req() req: CookieRequest,
    @Res({ passthrough: true }) res: CookieReply,
  ) {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw new UnauthorizedException('Refresh token не найден');

    const result = await this.auth.refresh(token);
    res.setCookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);
    return { accessToken: result.accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Выход — инвалидирует refresh token' })
  @ApiCookieAuth(REFRESH_COOKIE)
  @ApiResponse({ status: 200, description: 'Выход выполнен' })
  async logout(
    @Req() req: CookieRequest,
    @Res({ passthrough: true }) res: CookieReply,
  ) {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (token) await this.auth.logout(token);
    res.clearCookie(REFRESH_COOKIE, { path: '/auth' });
    return { message: 'Выход выполнен' };
  }
}
