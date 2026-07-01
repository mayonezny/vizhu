import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CallsService } from './calls.service';
import { CallsController } from './calls.controller';

@Module({
  imports: [ConfigModule],
  controllers: [CallsController],
  providers: [CallsService],
  exports: [CallsService], // чтобы модуль матчинга (след. шаг) мог дёргать createToken/ensureRoom
})
export class CallsModule {}
