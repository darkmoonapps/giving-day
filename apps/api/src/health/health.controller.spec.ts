import { describe, expect, it } from 'vitest';
import { healthResponseSchema } from '@giving-day/shared';
import { HealthController } from './health.controller';
import type { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  it('returns a healthy payload when the database is connected', async () => {
    const prisma = {
      isConnected: async (): Promise<boolean> => true,
    };
    const controller = new HealthController(prisma as PrismaService);

    const result = await controller.getHealth();

    expect(result.status).toBe('healthy');
    expect(result.database.connected).toBe(true);
    expect(healthResponseSchema.parse(result)).toEqual(result);
  });

  it('returns an unhealthy payload when the database is down', async () => {
    const prisma = {
      isConnected: async (): Promise<boolean> => false,
    };
    const controller = new HealthController(prisma as PrismaService);

    const result = await controller.getHealth();

    expect(result.status).toBe('unhealthy');
    expect(result.database.connected).toBe(false);
  });
});
