import {
  Controller, Post, UploadedFile,
  UseInterceptors, Query, ParseEnumPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiService, DescribeMode } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // POST /api/ai/describe?mode=short|detailed
  @Post('describe')
  @UseInterceptors(FileInterceptor('image'))
  describe(
    @UploadedFile() file: Express.Multer.File,
    @Query('mode') mode: DescribeMode = 'short',
  ) {
    return this.aiService.describeScene(file.buffer, file.mimetype, mode);
  }

  // POST /api/ai/currency
  @Post('currency')
  @UseInterceptors(FileInterceptor('image'))
  currency(@UploadedFile() file: Express.Multer.File) {
    return this.aiService.recognizeCurrency(file.buffer, file.mimetype);
  }

  // POST /api/ai/ocr
  @Post('ocr')
  @UseInterceptors(FileInterceptor('image'))
  ocr(@UploadedFile() file: Express.Multer.File) {
    return this.aiService.extractText(file.buffer, file.mimetype);
  }
}
