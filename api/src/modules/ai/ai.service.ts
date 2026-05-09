import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export type DescribeMode = 'short' | 'detailed';

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

  async describeScene(
    imageBuffer: Buffer,
    mimeType: string,
    mode: DescribeMode,
  ): Promise<unknown> {
    return this.callAi('/describe', {
      image: imageBuffer.toString('base64'),
      mime_type: mimeType,
      mode,
    });
  }

  async recognizeCurrency(
    imageBuffer: Buffer,
    mimeType: string,
  ): Promise<unknown> {
    return this.callAi('/currency', {
      image: imageBuffer.toString('base64'),
      mime_type: mimeType,
    });
  }

  async extractText(imageBuffer: Buffer, mimeType: string): Promise<unknown> {
    return this.callAi('/ocr', {
      image: imageBuffer.toString('base64'),
      mime_type: mimeType,
    });
  }

  async customChat(text: string, context?: string): Promise<unknown> {
    return this.callAi('/chat', { text, context });
  }

  async classifyVoiceCommand(text: string): Promise<unknown> {
    return this.callAi('/classify', { text });
  }

  async transcribeSpeech(
    audioBuffer: Buffer,
    mimeType: string,
    lang = 'ru-RU',
  ): Promise<unknown> {
    return this.callAi('/stt', {
      audio: audioBuffer.toString('base64'),
      mime_type: mimeType,
      lang,
    });
  }

  private async callAi(path: string, body: object): Promise<unknown> {
    try {
      const response = await firstValueFrom(
        this.http.post<unknown>(`${this.aiUrl}${path}`, body),
      );
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`AI service error on ${path}: ${message}`);
      throw error;
    }
  }
}
