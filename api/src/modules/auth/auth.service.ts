import {
  Injectable,
  BadRequestException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomInt } from 'crypto';
import { SmsService } from '../sms/sms.service';
import { OtpCode } from './otp-code.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { PhoneAccount } from '../users/entities/phone-account.entity';

const OTP_TTL_MINUTES = 5;
const OTP_ATTEMPTS_MAX = 5;
const REFRESH_TTL_DAYS = 30;
/** Сколько живёт СТАРЫЙ refresh-токен после ротации (см. refresh()). */
const ROTATION_GRACE_MS = 60_000;
const REFRESH_COOKIE = 'refresh_token';

export { REFRESH_COOKIE };

export interface VerifyOtpResult {
  accessToken: string;
  refreshToken: string;
  isNewUser: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(OtpCode)
    private readonly otpRepo: Repository<OtpCode>,
    @InjectRepository(PhoneAccount)
    private readonly phoneAccountRepo: Repository<PhoneAccount>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    private readonly sms: SmsService,
    private readonly jwt: JwtService,
  ) {}

  async sendOtp(phone: string): Promise<void> {
    const normalizedPhone = this.normalizePhone(phone);
    const code = randomInt(1000, 10000).toString();

    await this.otpRepo.delete({ phone: normalizedPhone });

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_TTL_MINUTES);

    await this.otpRepo.save({
      phone: normalizedPhone,
      code,
      attempts: 0,
      expiresAt,
    });
    await this.sms.sendOtp(normalizedPhone, code);
    this.logger.log(`OTP отправлен на ${normalizedPhone}`);
  }

  async verifyOtp(phone: string, code: string): Promise<VerifyOtpResult> {
    const normalizedPhone = this.normalizePhone(phone);

    const otp = await this.otpRepo.findOne({
      where: { phone: normalizedPhone },
    });
    if (!otp) throw new BadRequestException('Код не найден. Запросите новый.');

    if (new Date() > otp.expiresAt) {
      await this.otpRepo.delete({ id: otp.id });
      throw new BadRequestException('Код истёк. Запросите новый.');
    }

    otp.attempts += 1;
    await this.otpRepo.save(otp);

    if (otp.attempts > OTP_ATTEMPTS_MAX) {
      await this.otpRepo.delete({ id: otp.id });
      throw new BadRequestException(
        'Превышено количество попыток. Запросите новый код.',
      );
    }

    if (otp.code !== code) throw new BadRequestException('Неверный код');

    await this.otpRepo.delete({ id: otp.id });

    let phoneAccount = await this.phoneAccountRepo.findOne({
      where: { phone: normalizedPhone },
    });
    const isNewUser = !phoneAccount;

    if (!phoneAccount) {
      phoneAccount = this.phoneAccountRepo.create({ phone: normalizedPhone });
      await this.phoneAccountRepo.save(phoneAccount);
    }

    const accessToken = this.jwt.sign({
      sub: phoneAccount.uuid,
      phone: normalizedPhone,
    });
    const refreshToken = await this.createRefreshToken(phoneAccount.uuid);

    return { accessToken, refreshToken, isNewUser };
  }

  async refresh(
    rawToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const hash = this.hashToken(rawToken);
    const record = await this.refreshTokenRepo.findOne({
      where: { tokenHash: hash },
      relations: ['phoneAccount'],
    });

    if (!record || new Date() > record.expiresAt) {
      if (record) await this.refreshTokenRepo.delete({ uuid: record.uuid });
      throw new UnauthorizedException('Refresh token недействителен');
    }

    // Ротация с grace-окном вместо мгновенного удаления: мобильный клиент
    // может не успеть сохранить новый токен (приложение убили, сеть оборвалась
    // после ответа) — тогда он повторно придёт со старым токеном и получит
    // новую пару, а не вечный разлогин. Старый токен доживает ROTATION_GRACE_MS.
    const graceDeadline = new Date(Date.now() + ROTATION_GRACE_MS);
    if (record.expiresAt > graceDeadline) {
      await this.refreshTokenRepo.update(
        { uuid: record.uuid },
        { expiresAt: graceDeadline },
      );
    }

    // Заодно подчищаем протухшие токены аккаунта (в т.ч. отработавшие grace).
    await this.refreshTokenRepo.delete({
      phoneAccountId: record.phoneAccountId,
      expiresAt: LessThan(new Date()),
    });

    const newRefreshToken = await this.createRefreshToken(
      record.phoneAccountId,
    );
    const accessToken = this.jwt.sign({
      sub: record.phoneAccount.uuid,
      phone: record.phoneAccount.phone,
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(rawToken: string): Promise<void> {
    await this.refreshTokenRepo.delete({ tokenHash: this.hashToken(rawToken) });
  }

  private async createRefreshToken(phoneAccountId: string): Promise<string> {
    const raw = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TTL_DAYS);
    await this.refreshTokenRepo.save({
      phoneAccountId,
      tokenHash: this.hashToken(raw),
      expiresAt,
    });
    return raw;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('8')) return '7' + digits.slice(1);
    return digits;
  }
}
