import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { AiModule } from './modules/ai/ai.module';
import { HistoryModule } from './modules/history/history.module';
import { HealthController } from './common/health.controller';
// TODO: import { AuthModule } from './modules/auth/auth.module';
// TODO: import { VisionModule } from './modules/vision/vision.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== 'production', // в проде — миграции
    }),

    HttpModule.register({ timeout: 15000 }), // 15с для AI-запросов

    // TODO: AuthModule,
    // TODO: VisionModule,
    AiModule,
    HistoryModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
