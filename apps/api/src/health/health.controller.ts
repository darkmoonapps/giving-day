import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { healthResponseSchema, type HealthResponse } from '@giving-day/shared';
import { PrismaService } from '../prisma/prisma.service';
import { HealthResponseDto } from './dto/health-response.dto';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({
    operationId: 'getHealth',
    summary: 'Get API and database health',
  })
  @ApiOkResponse({ type: HealthResponseDto })
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
