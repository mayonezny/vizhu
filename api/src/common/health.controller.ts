import { Controller, Get } from '@nestjs/common';

// docker-compose healthcheck стучится сюда
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
