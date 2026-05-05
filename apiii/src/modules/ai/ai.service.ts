import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export type DescribeMode = 'short' | 'detailed';
export type AiTask = 'describe' | 'currency' | 'ocr';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly aiUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.aiUrl = this.config.get<string>('AI_SERVICE_URL', 'http://ai:8000');
  }

  // ФТ-1: описание сцены
  async describeScene(imageBuffer: Buffer, mimeType: string, mode: DescribeMode) {
    return this.callAi('/describe', {
      image: imageBuffer.toString('base64'),
      mime_type: mimeType,
      mode,
    });
  }

  // ФТ-3: распознавание купюр
  async recognizeCurrency(imageBuffer: Buffer, mimeType: string) {
    return this.callAi('/currency', {
      image: imageBuffer.toString('base64'),
      mime_type: mimeType,
    });
  }

  // ФТ-2: OCR
  async extractText(imageBuffer: Buffer, mimeType: string) {
    return this.callAi('/ocr', {
      image: imageBuffer.toString('base64'),
      mime_type: mimeType,
    });
  }

  private async callAi(path: string, body: object) {
    try {
      const response = await firstValueFrom(
        this.http.post(`${this.aiUrl}${path}`, body),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`AI service error on ${path}:`, error.message);
      throw error;
    }
  }
}
