import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CallsService } from './calls.service';
import { CallsController } from './calls.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [ConfigModule, AuthModule, UsersModule],
  controllers: [CallsController],
  providers: [CallsService],
  exports: [CallsService], // чтобы модуль матчинга (след. шаг) мог дёргать createToken/ensureRoom
})
export class CallsModule {}
