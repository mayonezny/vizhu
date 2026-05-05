// ФТ-1: описание сцены, ФТ-3: купюры
// NestJS принимает файл от клиента → передаёт base64 в Python AI-сервис

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [HttpModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
