import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CallsService } from './calls.service';
import { CallsController } from './calls.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { CallsGateway } from './calls.gateway';
import { MatchingService } from './matching.service';
import { InMemoryMatchingStore } from './in-memory-matching.store';
import { RedisMatchingStore } from './redis-matching.store';
import { MATCHING_STORE, type MatchingStore } from './matching.store';

@Module({
  imports: [ConfigModule, AuthModule, UsersModule],
  controllers: [CallsController],
  providers: [
    CallsService,
    {
      provide: MATCHING_STORE,
      inject: [ConfigService],
      useFactory: (config: ConfigService): MatchingStore => {
        const backend = config.get<string>('MATCHING_BACKEND', 'memory');
        if (backend === 'memory') return new InMemoryMatchingStore();
        if (backend === 'redis') {
          return new RedisMatchingStore(
            config.get<string>('REDIS_URL', 'redis://redis:6379'),
          );
        }
        throw new Error(`Unknown MATCHING_BACKEND: ${backend}`);
      },
    },
    MatchingService,
    CallsGateway,
  ],
  exports: [CallsService, MatchingService],
})
export class CallsModule {}
