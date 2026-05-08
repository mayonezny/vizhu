import { Controller, Post, Req, Query } from '@nestjs/common';
import { AiService, type DescribeMode } from './ai.service';

// Локальные интерфейсы — избегаем emitDecoratorMetadata-конфликта с FastifyRequest
interface UploadedFile {
  toBuffer(): Promise<Buffer>;
  mimetype: string;
}

interface MultipartRequest {
  file(): Promise<UploadedFile>;
}

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // POST /api/ai/describe?mode=short|detailed
  @Post('describe')
  async describe(
    @Req() req: object,
    @Query('mode') mode: DescribeMode = 'short',
  ): Promise<unknown> {
    const { buffer, mimetype } = await this.extractFile(req);
    return this.aiService.describeScene(buffer, mimetype, mode);
  }

  // POST /api/ai/currency
  @Post('currency')
  async currency(@Req() req: object): Promise<unknown> {
    const { buffer, mimetype } = await this.extractFile(req);
    return this.aiService.recognizeCurrency(buffer, mimetype);
  }

  // POST /api/ai/ocr
  @Post('ocr')
  async ocr(@Req() req: object): Promise<unknown> {
    const { buffer, mimetype } = await this.extractFile(req);
    return this.aiService.extractText(buffer, mimetype);
  }

  // POST /api/ai/stt?lang=ru-RU
  @Post('stt')
  async stt(
    @Req() req: object,
    @Query('lang') lang = 'ru-RU',
  ): Promise<unknown> {
    const { buffer, mimetype } = await this.extractFile(req);
    return this.aiService.transcribeSpeech(buffer, mimetype, lang);
  }

  private async extractFile(
    req: object,
  ): Promise<{ buffer: Buffer; mimetype: string }> {
    const file = await (req as MultipartRequest).file();
    const buffer = await file.toBuffer();
    return { buffer, mimetype: file.mimetype };
  }
}
