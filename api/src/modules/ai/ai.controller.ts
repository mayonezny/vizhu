import {
  Body,
  Controller,
  Logger,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AiService, type DescribeMode } from './ai.service';
import { HistoryService } from '../history/history.service';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt.guard';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import type { RequestType } from '../history/history.entity';

interface UploadedFile {
  toBuffer(): Promise<Buffer>;
  mimetype: string;
}

interface MultipartRequest {
  file(): Promise<UploadedFile>;
  user?: JwtPayload | null;
}

type AiResponse = { text?: string; [key: string]: unknown };

@Controller('ai')
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(
    private readonly aiService: AiService,
    private readonly historyService: HistoryService,
  ) {}

  @Post('describe')
  @UseGuards(OptionalJwtAuthGuard)
  async describe(
    @Req() req: object,
    @Query('mode') mode: DescribeMode = 'detailed',
  ): Promise<unknown> {
    const { buffer, mimetype } = await this.extractFile(req);
    const result = (await this.aiService.describeScene(
      buffer,
      mimetype,
      mode,
    )) as AiResponse;
    await this.saveHistory(req, 'describe', 'Описание сцены', result);
    return result;
  }

  @Post('currency')
  @UseGuards(OptionalJwtAuthGuard)
  async currency(@Req() req: object): Promise<unknown> {
    const { buffer, mimetype } = await this.extractFile(req);
    const result = (await this.aiService.recognizeCurrency(
      buffer,
      mimetype,
    )) as AiResponse;
    await this.saveHistory(req, 'currency', 'Распознавание валюты', result);
    return result;
  }

  @Post('ocr')
  @UseGuards(OptionalJwtAuthGuard)
  async ocr(@Req() req: object): Promise<unknown> {
    const { buffer, mimetype } = await this.extractFile(req);
    const result = (await this.aiService.extractText(
      buffer,
      mimetype,
    )) as AiResponse;
    await this.saveHistory(req, 'ocr', 'Распознавание текста', result);
    return result;
  }

  @Post('chat')
  async chat(
    @Body('text') text: string,
    @Body('context') context?: string,
  ): Promise<unknown> {
    return this.aiService.customChat(text, context);
  }

  @Post('classify')
  async classify(@Body('text') text: string): Promise<unknown> {
    return this.aiService.classifyVoiceCommand(text);
  }

  @Post('stt')
  async stt(
    @Req() req: object,
    @Query('lang') lang = 'ru-RU',
  ): Promise<unknown> {
    const { buffer, mimetype } = await this.extractFile(req);
    return this.aiService.transcribeSpeech(buffer, mimetype, lang);
  }

  private async saveHistory(
    req: object,
    type: RequestType,
    userText: string,
    result: AiResponse,
  ): Promise<void> {
    try {
      const user = (req as { user?: JwtPayload | null }).user;
      const phoneAccountId = user?.sub ?? null;
      const responseText =
        typeof result.text === 'string' ? result.text : JSON.stringify(result);
      const title = responseText.slice(0, 200);
      const now = new Date().toISOString();
      await this.historyService.create({
        phoneAccountId,
        type,
        title,
        messages: [
          { role: 'user', text: userText, timestamp: now },
          { role: 'assistant', text: responseText, timestamp: now },
        ],
      });
    } catch (err) {
      this.logger.error(`Failed to save history: ${String(err)}`);
    }
  }

  private async extractFile(
    req: object,
  ): Promise<{ buffer: Buffer; mimetype: string }> {
    const file = await (req as MultipartRequest).file();
    const buffer = await file.toBuffer();
    return { buffer, mimetype: file.mimetype };
  }
}
