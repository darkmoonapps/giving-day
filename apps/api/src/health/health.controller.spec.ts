import { describe, it, expect, vi } from 'vitest';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  it('should return healthy status when database is connected', async () => {
    const mockPrismaService = {
      isConnected: vi.fn().mockResolvedValue(true),
    } as unknown as PrismaService;

    const controller = new HealthController(mockPrismaService);
    const result = await controller.getHealth();

    expect(result.status).toBe('healthy');
    expect(result.database.connected).toBe(true);
    expect(result.timestamp).toBeDefined();
    expect(mockPrismaService.isConnected).toHaveBeenCalledOnce();
  });

  it('should return unhealthy status when database is disconnected', async () => {
    const mockPrismaService = {
      isConnected: vi.fn().mockResolvedValue(false),
    } as unknown as PrismaService;

    const controller = new HealthController(mockPrismaService);
    const result = await controller.getHealth();

    expect(result.status).toBe('unhealthy');
    expect(result.database.connected).toBe(false);
    expect(result.timestamp).toBeDefined();
    expect(mockPrismaService.isConnected).toHaveBeenCalledOnce();
  });

  it('should return ISO timestamp', async () => {
    const mockPrismaService = {
      isConnected: vi.fn().mockResolvedValue(true),
    } as unknown as PrismaService;

    const controller = new HealthController(mockPrismaService);
    const result = await controller.getHealth();

    const timestamp = new Date(result.timestamp);
    expect(timestamp.toISOString()).toBe(result.timestamp);
  });
});
