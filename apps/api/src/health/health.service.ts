import { Injectable } from '@nestjs/common';
import { healthResponseSchema, type HealthResponse } from '@giving-day/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth(): Promise<HealthResponse> {
    const dbConnected = await this.prisma.isConnected();
    const payload: HealthResponse = {
      status: dbConnected ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: dbConnected,
      },
    };

    return healthResponseSchema.parse(payload);
  }
}
