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
  headers?: Record<string, string | string[] | undefined>;
}

/**
 * Нативный клиент (Capacitor) шлёт X-Client: native.
 * Для него refresh-токен ходит в теле запроса/ответа, а не в куке:
 * куки между capacitor://localhost и API-доменом ненадёжны, токен хранится
 * в Keychain / EncryptedSharedPreferences на устройстве.
 */
const isNativeClient = (req: CookieRequest): boolean =>
  req.headers?.['x-client'] === 'native';

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
  path: '/',
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

class RefreshBody {
  @ApiProperty({
    required: false,
    description:
      'Refresh token — только для нативного клиента (X-Client: native). Web использует httpOnly-куку.',
  })
  refreshToken?: unknown;
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
    @Req() req: CookieRequest,
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
    if (isNativeClient(req)) {
      // Натив хранит refresh-токен сам (Keychain/EncryptedSharedPreferences)
      return {
        accessToken: result.accessToken,
        isNewUser: result.isNewUser,
        refreshToken: result.refreshToken,
      };
    }
    res.setCookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);
    return { accessToken: result.accessToken, isNewUser: result.isNewUser };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Обновить accessToken по refresh cookie (web) или refreshToken из тела (X-Client: native)',
  })
  @ApiCookieAuth(REFRESH_COOKIE)
  @ApiBody({ type: RefreshBody, required: false })
  @ApiResponse({ status: 200, description: '{ accessToken, refreshToken? }' })
  @ApiResponse({ status: 401, description: 'Refresh token недействителен' })
  async refresh(
    @Body() body: RefreshBody | undefined,
    @Req() req: CookieRequest,
    @Res({ passthrough: true }) res: CookieReply,
  ) {
    const native = isNativeClient(req);
    const bodyToken =
      typeof body?.refreshToken === 'string' && body.refreshToken !== ''
        ? body.refreshToken
        : undefined;
    const token = native ? bodyToken : req.cookies?.[REFRESH_COOKIE];
    if (!token) throw new UnauthorizedException('Refresh token не найден');

    const result = await this.auth.refresh(token);
    if (native) {
      // ротация: клиент обязан сохранить новый refreshToken
      return {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      };
    }
    res.setCookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);
    return { accessToken: result.accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Выход — инвалидирует refresh token' })
  @ApiCookieAuth(REFRESH_COOKIE)
  @ApiResponse({ status: 200, description: 'Выход выполнен' })
  async logout(
    @Body() body: RefreshBody | undefined,
    @Req() req: CookieRequest,
    @Res({ passthrough: true }) res: CookieReply,
  ) {
    const bodyToken =
      typeof body?.refreshToken === 'string' && body.refreshToken !== ''
        ? body.refreshToken
        : undefined;
    const token = bodyToken ?? req.cookies?.[REFRESH_COOKIE];
    if (token) await this.auth.logout(token);
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
    return { message: 'Выход выполнен' };
  }
}
