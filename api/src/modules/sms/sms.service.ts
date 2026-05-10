import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface SmscResponse {
  id?: number;
  cnt?: number;
  error?: string;
  error_code?: number;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly apiUrl = 'https://smsc.ru/sys/send.php';

  constructor(private config: ConfigService) {}

  async sendOtp(phone: string, code: string): Promise<void> {
    const message = `Ваш код подтверждения ВИЖУ: ${code}. Действует 5 минут.`;

    try {
      const response = await axios.get<SmscResponse>(this.apiUrl, {
        params: {
          apikey: this.config.get<string>('SMSC_API_KEY'),
          phones: phone,
          mes: message,
          charset: 'utf-8',
          fmt: 3, // ответ в JSON
        },
      });

      const data = response.data;

      if (data.error_code) {
        this.logger.error(
          `SMSC ошибка: ${data.error} (код ${data.error_code})`,
        );
        throw new InternalServerErrorException('Не удалось отправить SMS');
      }

      this.logger.log(`OTP отправлен на ${phone}, message_id: ${data.id}`);
    } catch (err) {
      if (err instanceof InternalServerErrorException) throw err;
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Ошибка запроса к SMSC: ${message}`);
      throw new InternalServerErrorException('Не удалось отправить SMS');
    }
  }
}
