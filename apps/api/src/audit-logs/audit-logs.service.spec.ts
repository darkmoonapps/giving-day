import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AbilityFactory } from '../abilities/ability.factory';
import { PrismaService } from '../prisma/prisma.service';
import {
  CITY_A_ID,
  CITY_B_ID,
  COORDINATOR_A_ID,
  coordinatorA,
  coordinatorB,
  volunteerA,
} from '../test/fake-users';
import { AuditLogsService } from './audit-logs.service';

const ENTRY_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const MEMBERSHIP_ID = '99999999-9999-4999-8999-999999999999';
const USER_TAMAR_ID = '12121212-1212-4121-8121-121212121212';

describe('AuditLogsService', () => {
  let service: AuditLogsService;

  const mockPrisma = {
    auditLog: {
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogsService,
        AbilityFactory,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(AuditLogsService);
    vi.clearAllMocks();
    mockPrisma.auditLog.create.mockResolvedValue({});
    mockPrisma.auditLog.count.mockResolvedValue(0);
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
  });

  describe('record', () => {
    it('writes an id-only Holon membership approve entry', async () => {
      await service.record({
        cityId: CITY_A_ID,
        actorId: COORDINATOR_A_ID,
        action: 'membership.approve',
        entity: 'membership',
        entityId: MEMBERSHIP_ID,
        diff: { userId: USER_TAMAR_ID, role: 'volunteer' },
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cityId: CITY_A_ID,
          actorId: COORDINATOR_A_ID,
          action: 'membership.approve',
          entity: 'membership',
          entityId: MEMBERSHIP_ID,
          diff: { userId: USER_TAMAR_ID, role: 'volunteer' },
        }),
      });
    });
  });

  describe('listForCity', () => {
    it('returns newest-first Holon entries for a coordinator', async () => {
      mockPrisma.auditLog.count.mockResolvedValue(1);
      mockPrisma.auditLog.findMany.mockResolvedValue([
        {
          id: ENTRY_ID,
          cityId: CITY_A_ID,
          actorId: COORDINATOR_A_ID,
          action: 'membership.approve',
          entity: 'membership',
          entityId: MEMBERSHIP_ID,
          diff: { userId: USER_TAMAR_ID, role: 'volunteer' },
          at: new Date('2026-11-13T09:00:00.000Z'),
        },
      ]);

      const result = await service.listForCity(
        CITY_A_ID,
        { page: 1, pageSize: 20 },
        coordinatorA()
      );

      expect(result).toEqual({
        entries: [
          {
            id: ENTRY_ID,
            cityId: CITY_A_ID,
            actorId: COORDINATOR_A_ID,
            action: 'membership.approve',
            entity: 'membership',
            entityId: MEMBERSHIP_ID,
            diff: { userId: USER_TAMAR_ID, role: 'volunteer' },
            at: '2026-11-13T09:00:00.000Z',
          },
        ],
        page: 1,
        pageSize: 20,
        total: 1,
      });
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { cityId: CITY_A_ID },
          orderBy: { at: 'desc' },
          skip: 0,
          take: 20,
        })
      );
    });

    it('hides another city from a Holon coordinator with 404', async () => {
      await expect(
        service.listForCity(
          CITY_B_ID,
          { page: 1, pageSize: 20 },
          coordinatorA()
        )
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockPrisma.auditLog.findMany).not.toHaveBeenCalled();
    });

    it('denies volunteers', async () => {
      await expect(
        service.listForCity(CITY_A_ID, { page: 1, pageSize: 20 }, volunteerA())
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('allows a coordinator from another city only for their city', async () => {
      mockPrisma.auditLog.count.mockResolvedValue(0);
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      await expect(
        service.listForCity(
          CITY_B_ID,
          { page: 1, pageSize: 10 },
          coordinatorB()
        )
      ).resolves.toEqual({
        entries: [],
        page: 1,
        pageSize: 10,
        total: 0,
      });
    });
  });
});
