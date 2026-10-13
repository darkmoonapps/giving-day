import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { HealthResponse } from '@giving-day/shared';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getHealth(): Promise<HealthResponse> {
    const dbConnected = await this.prisma.isConnected();
    return {
      status: dbConnected ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: dbConnected,
      },
    };
  }
}
