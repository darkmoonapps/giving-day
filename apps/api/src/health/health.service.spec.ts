import { describe, expect, it, vi } from 'vitest';
import { HealthService } from './health.service';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthService', () => {
  it('maps a connected database to a healthy payload', async () => {
    const prisma = {
      isConnected: vi.fn().mockResolvedValue(true),
    } as unknown as PrismaService;
    const service = new HealthService(prisma);

    const result = await service.getHealth();

    expect(result).toMatchObject({
      status: 'healthy',
      database: { connected: true },
    });
  });
});
