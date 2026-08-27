import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { MatchingService } from '../modules/calls/matching.service';

// docker-compose healthcheck стучится сюда
@Controller('health')
export class HealthController {
  constructor(private readonly matching: MatchingService) {}

  @Get()
  async check() {
    if (!(await this.matching.isStoreReady())) {
      throw new ServiceUnavailableException('Matching store is unavailable');
    }
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
