import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { SmsService } from '../sms/sms.service';
import { OtpCode } from './otp-code.entity';

const OTP_TTL_MINUTES = 5;
const OTP_ATTEMPTS_MAX = 5;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(OtpCode)
    private readonly otpRepo: Repository<OtpCode>,
    private readonly sms: SmsService,
    private readonly jwt: JwtService,
  ) {}

  async sendOtp(phone: string): Promise<void> {
    const normalizedPhone = this.normalizePhone(phone);
    const code = this.generateCode();

    // Удаляем старые коды для этого номера
    await this.otpRepo.delete({ phone: normalizedPhone });

    // Создаём новый с TTL
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

  async verifyOtp(
    phone: string,
    code: string,
  ): Promise<{ accessToken: string }> {
    const normalizedPhone = this.normalizePhone(phone);

    const otp = await this.otpRepo.findOne({
      where: { phone: normalizedPhone },
    });

    if (!otp) {
      throw new BadRequestException('Код не найден. Запросите новый.');
    }

    // Проверяем не истёк ли
    if (new Date() > otp.expiresAt) {
      await this.otpRepo.delete({ id: otp.id });
      throw new BadRequestException('Код истёк. Запросите новый.');
    }

    // Инкрементируем попытки
    otp.attempts += 1;
    await this.otpRepo.save(otp);

    if (otp.attempts > OTP_ATTEMPTS_MAX) {
      await this.otpRepo.delete({ id: otp.id });
      throw new BadRequestException(
        'Превышено количество попыток. Запросите новый код.',
      );
    }

    if (otp.code !== code) {
      throw new BadRequestException('Неверный код');
    }

    // Всё ок — удаляем использованный код
    await this.otpRepo.delete({ id: otp.id });

    // TODO: найти или создать пользователя по номеру телефона
    // const user = await this.usersService.findOrCreate(normalizedPhone);

    const accessToken = this.jwt.sign({
      phone: normalizedPhone,
      // sub: user.id,
    });

    return { accessToken };
  }

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('8')) return '7' + digits.slice(1);
    return digits;
  }

  private generateCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }
}
