import { describe, it, expect, vi } from 'vitest';
import { healthResponseSchema } from '@giving-day/shared';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PrismaService } from '../prisma/prisma.service';

function createController(connected: boolean): {
  controller: HealthController;
  prisma: PrismaService;
} {
  const prisma = {
    isConnected: vi.fn().mockResolvedValue(connected),
  } as unknown as PrismaService;
  const service = new HealthService(prisma);
  return {
    controller: new HealthController(service),
    prisma,
  };
}

describe('HealthController', () => {
  it('should return healthy status when database is connected', async () => {
    const { controller, prisma } = createController(true);
    const result = await controller.getHealth();

    expect(result.status).toBe('healthy');
    expect(result.database.connected).toBe(true);
    expect(result.timestamp).toBeDefined();
    expect(healthResponseSchema.parse(result)).toEqual(result);
    expect(prisma.isConnected).toHaveBeenCalledOnce();
  });

  it('should return unhealthy status when database is disconnected', async () => {
    const { controller, prisma } = createController(false);
    const result = await controller.getHealth();

    expect(result.status).toBe('unhealthy');
    expect(result.database.connected).toBe(false);
    expect(result.timestamp).toBeDefined();
    expect(prisma.isConnected).toHaveBeenCalledOnce();
  });

  it('should return ISO timestamp', async () => {
    const { controller } = createController(true);
    const result = await controller.getHealth();

    const timestamp = new Date(result.timestamp);
    expect(timestamp.toISOString()).toBe(result.timestamp);
  });
});
