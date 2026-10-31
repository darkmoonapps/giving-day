import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AbilityFactory } from '../abilities/ability.factory';
import { PrismaService } from '../prisma/prisma.service';
import {
  CITY_A_ID,
  CITY_B_ID,
  COORDINATOR_A_ID,
  coordinatorA,
  coordinatorB,
  superAdmin,
  VOLUNTEER_A_ID,
  VOLUNTEER_B_ID,
  volunteerA,
} from '../test/fake-users';
import { DeliveriesService } from './deliveries.service';

const DAY_ID = '33333333-3333-4333-8333-333333333333';
const ELDER_RIVKAH_ID = '12121212-1212-4121-8121-121212121212';
const ELDER_YOSEF_ID = '13131313-1313-4131-8131-131313131313';
const MATCH_PERM_ID = '14141414-1414-4141-8141-141414141414';
const MATCH_ONETIME_ID = '15151515-1515-4151-8151-151515151515';
const DELIVERY_RIVKAH_ID = '16161616-1616-4161-8161-161616161616';
const DELIVERY_YOSEF_ID = '17171717-1717-4171-8171-171717171717';

describe('DeliveriesService', () => {
  let service: DeliveriesService;

  const publishedDay = {
    id: DAY_ID,
    createdAt: new Date('2026-10-28T09:00:00.000Z'),
    updatedAt: new Date('2026-10-28T09:00:00.000Z'),
    cityId: CITY_A_ID,
    date: new Date('2026-11-15T00:00:00.000Z'),
    startTime: new Date(Date.UTC(1970, 0, 1, 9, 0, 0)),
    endTime: new Date(Date.UTC(1970, 0, 1, 14, 0, 0)),
    notesForVolunteers: 'Bring a folding cart',
    internalNotes: 'Need extra rice bags',
    addOns: ['holiday honey'],
    status: 'published' as const,
    publishedAt: new Date('2026-10-28T09:00:00.000Z'),
    closedAt: null,
    createdById: COORDINATOR_A_ID,
  };

  const tamarContact = {
    name: 'Tamar Levi',
    relation: 'child' as const,
    phone: '+972506666666',
    isPrimary: true,
  };

  const rivkahElder = {
    id: ELDER_RIVKAH_ID,
    fullName: 'Rivkah Levi',
    street: '12 Example St',
    houseNumber: '12',
    entrance: 'B',
    floor: '3',
    apartment: '7',
    addressNotes: 'Knock loudly',
    notes: 'Entrance is around the back',
    contacts: [tamarContact],
  };

  const yosefElder = {
    id: ELDER_YOSEF_ID,
    fullName: 'Yosef Abraham',
    street: '4 Park Ave',
    houseNumber: '4',
    entrance: null,
    floor: null,
    apartment: null,
    addressNotes: null,
    notes: null,
    contacts: [],
  };

  const assignedRivkah = {
    id: DELIVERY_RIVKAH_ID,
    createdAt: new Date('2026-10-28T09:00:00.000Z'),
    updatedAt: new Date('2026-10-28T09:00:00.000Z'),
    cityId: CITY_A_ID,
    dayId: DAY_ID,
    elderId: ELDER_RIVKAH_ID,
    volunteerId: VOLUNTEER_A_ID,
    matchId: MATCH_PERM_ID,
    status: 'assigned' as const,
    notDeliveredReason: null,
    note: null,
    routeOrder: null,
    assignedAt: new Date('2026-10-28T09:00:00.000Z'),
    pickedAt: null,
    finalAt: null,
    resolution: null,
    resolvedById: null,
    elder: rivkahElder,
    volunteer: {
      id: VOLUNTEER_A_ID,
      firstName: 'Yonatan',
      lastName: 'Bar',
    },
  };

  const unassignedYosef = {
    ...assignedRivkah,
    id: DELIVERY_YOSEF_ID,
    elderId: ELDER_YOSEF_ID,
    volunteerId: null,
    matchId: MATCH_ONETIME_ID,
    status: 'unassigned' as const,
    assignedAt: null,
    elder: yosefElder,
    volunteer: null,
  };

  const mockPrisma = {
    city: { findUnique: vi.fn() },
    distributionDay: { findFirst: vi.fn() },
    match: { findMany: vi.fn() },
    delivery: {
      createMany: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    deliveryEvent: {
      createMany: vi.fn(),
      create: vi.fn(),
    },
    dayParticipation: { findUnique: vi.fn() },
    cityMembership: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockPrisma.city.findUnique.mockResolvedValue({
      id: CITY_A_ID,
      archivedAt: null,
    });
    mockPrisma.distributionDay.findFirst.mockResolvedValue(publishedDay);
    mockPrisma.match.findMany.mockResolvedValue([]);
    mockPrisma.delivery.createMany.mockResolvedValue({ count: 0 });
    mockPrisma.delivery.findMany.mockResolvedValue([]);
    mockPrisma.delivery.findFirst.mockResolvedValue(null);
    mockPrisma.delivery.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.deliveryEvent.createMany.mockResolvedValue({ count: 0 });
    mockPrisma.deliveryEvent.create.mockResolvedValue({});
    mockPrisma.dayParticipation.findUnique.mockResolvedValue(null);
    mockPrisma.cityMembership.findMany.mockResolvedValue([]);
    mockPrisma.cityMembership.findUnique.mockResolvedValue(null);
    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mockPrisma) => Promise<unknown>) =>
        callback(mockPrisma)
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveriesService,
        AbilityFactory,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(DeliveriesService);
  });

  describe('prefillFromPermanentMatches', () => {
    it('creates assigned deliveries only from current permanent matches', async () => {
      mockPrisma.match.findMany.mockResolvedValue([
        {
          id: MATCH_PERM_ID,
          elderId: ELDER_RIVKAH_ID,
          volunteerId: VOLUNTEER_A_ID,
        },
      ]);
      mockPrisma.delivery.findMany.mockResolvedValue([
        {
          id: DELIVERY_RIVKAH_ID,
          volunteerId: VOLUNTEER_A_ID,
          status: 'assigned',
        },
      ]);

      const count = await service.prefillFromPermanentMatches(
        mockPrisma as never,
        {
          cityId: CITY_A_ID,
          dayId: DAY_ID,
          actorId: COORDINATOR_A_ID,
        }
      );

      expect(mockPrisma.match.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            cityId: CITY_A_ID,
            type: 'permanent',
            endsAt: null,
            elder: expect.objectContaining({
              status: 'active',
              archivedAt: null,
            }),
          }),
        })
      );
      expect(mockPrisma.delivery.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            cityId: CITY_A_ID,
            dayId: DAY_ID,
            elderId: ELDER_RIVKAH_ID,
            volunteerId: VOLUNTEER_A_ID,
            matchId: MATCH_PERM_ID,
            status: 'assigned',
          }),
        ],
      });
      expect(mockPrisma.deliveryEvent.createMany).toHaveBeenCalled();
      expect(count).toBe(1);
    });

    it('ignores deactivated and non-active elders when prefilling deliveries', async () => {
      mockPrisma.match.findMany.mockResolvedValue([]);

      const count = await service.prefillFromPermanentMatches(
        mockPrisma as never,
        {
          cityId: CITY_A_ID,
          dayId: DAY_ID,
          actorId: COORDINATOR_A_ID,
        }
      );

      expect(mockPrisma.match.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            elder: {
              cityId: CITY_A_ID,
              status: 'active',
              archivedAt: null,
            },
          }),
        })
      );
      expect(count).toBe(0);
      expect(mockPrisma.delivery.createMany).not.toHaveBeenCalled();
    });

    it('skips prefill when there are no current permanent matches', async () => {
      const count = await service.prefillFromPermanentMatches(
        mockPrisma as never,
        {
          cityId: CITY_A_ID,
          dayId: DAY_ID,
          actorId: COORDINATOR_A_ID,
        }
      );

      expect(count).toBe(0);
      expect(mockPrisma.delivery.createMany).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('returns every delivery and assignable volunteers to a coordinator', async () => {
      mockPrisma.delivery.findMany.mockResolvedValue([
        assignedRivkah,
        unassignedYosef,
      ]);
      mockPrisma.cityMembership.findMany.mockResolvedValue([
        {
          user: {
            id: VOLUNTEER_A_ID,
            firstName: 'Yonatan',
            lastName: 'Bar',
          },
        },
        {
          user: {
            id: VOLUNTEER_B_ID,
            firstName: 'Dana',
            lastName: 'Levi',
          },
        },
      ]);

      const result = await service.list(CITY_A_ID, DAY_ID, coordinatorA());

      expect(result).toMatchObject({
        unassignedCount: 1,
        assignableVolunteers: [
          { id: VOLUNTEER_A_ID, firstName: 'Yonatan', lastName: 'Bar' },
          { id: VOLUNTEER_B_ID, firstName: 'Dana', lastName: 'Levi' },
        ],
      });
      expect(result.deliveries[0]).toMatchObject({
        id: DELIVERY_YOSEF_ID,
        volunteerId: null,
        elder: { fullName: 'Yosef Abraham' },
      });
      expect(result.deliveries[1]).toMatchObject({
        volunteerId: VOLUNTEER_A_ID,
        volunteer: { firstName: 'Yonatan' },
      });
    });

    it('hides deliveries from a volunteer who has not confirmed', async () => {
      const result = await service.list(CITY_A_ID, DAY_ID, volunteerA());

      expect(result).toEqual({
        dayId: DAY_ID,
        cityId: CITY_A_ID,
        deliveries: [],
      });
      expect(result).not.toHaveProperty('assignableVolunteers');
      expect(mockPrisma.delivery.findMany).not.toHaveBeenCalled();
    });

    it('returns only own assigned deliveries after the volunteer confirms', async () => {
      mockPrisma.dayParticipation.findUnique.mockResolvedValue({
        id: '44444444-4444-4444-8444-444444444444',
        cityId: CITY_A_ID,
        dayId: DAY_ID,
        volunteerId: VOLUNTEER_A_ID,
        status: 'confirmed',
        respondedAt: new Date('2026-10-29T10:00:00.000Z'),
        cancelReason: null,
        finishedAt: null,
      });
      mockPrisma.delivery.findMany.mockResolvedValue([assignedRivkah]);

      const result = await service.list(CITY_A_ID, DAY_ID, volunteerA());

      expect(mockPrisma.delivery.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            cityId: CITY_A_ID,
            dayId: DAY_ID,
            volunteerId: VOLUNTEER_A_ID,
          }),
        })
      );
      expect(result.deliveries).toHaveLength(1);
      expect(result.deliveries[0]).toMatchObject({
        id: DELIVERY_RIVKAH_ID,
        elder: {
          fullName: 'Rivkah Levi',
          contacts: [tamarContact],
        },
      });
      expect(result.deliveries[0]).not.toHaveProperty('volunteerId');
      expect(JSON.stringify(result)).not.toContain('buildingCode');
      expect(JSON.stringify(result)).toContain('+972506666666');
      expect(JSON.stringify(result)).not.toContain('+972502222222');
    });

    it('hides another city from a coordinator', async () => {
      await expect(
        service.list(CITY_A_ID, DAY_ID, coordinatorB())
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('assign', () => {
    it('lets a coordinator move a delivery to another volunteer', async () => {
      const reassigned = {
        ...assignedRivkah,
        volunteerId: VOLUNTEER_B_ID,
        volunteer: {
          id: VOLUNTEER_B_ID,
          firstName: 'Dana',
          lastName: 'Levi',
        },
      };
      mockPrisma.delivery.findFirst
        .mockResolvedValueOnce(assignedRivkah)
        .mockResolvedValueOnce(reassigned);
      mockPrisma.cityMembership.findUnique.mockResolvedValue({
        role: 'volunteer',
        status: 'active',
        user: { archivedAt: null },
      });
      mockPrisma.delivery.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.assign(
        CITY_A_ID,
        DAY_ID,
        DELIVERY_RIVKAH_ID,
        { volunteerId: VOLUNTEER_B_ID },
        coordinatorA()
      );

      expect(result.volunteerId).toBe(VOLUNTEER_B_ID);
      expect(mockPrisma.delivery.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: DELIVERY_RIVKAH_ID,
            status: { in: ['unassigned', 'assigned'] },
          }),
          data: expect.objectContaining({
            volunteerId: VOLUNTEER_B_ID,
            status: 'assigned',
          }),
        })
      );
      expect(mockPrisma.delivery.update).not.toHaveBeenCalled();
      expect(mockPrisma.deliveryEvent.create).toHaveBeenCalled();
    });

    it('lets a coordinator unassign a delivery onto the needs-a-volunteer list', async () => {
      const unassigned = {
        ...assignedRivkah,
        volunteerId: null,
        status: 'unassigned' as const,
        assignedAt: null,
        volunteer: null,
      };
      mockPrisma.delivery.findFirst
        .mockResolvedValueOnce(assignedRivkah)
        .mockResolvedValueOnce(unassigned);
      mockPrisma.delivery.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.assign(
        CITY_A_ID,
        DAY_ID,
        DELIVERY_RIVKAH_ID,
        { volunteerId: null },
        coordinatorA()
      );

      expect(result.volunteerId).toBeNull();
      expect(result.status).toBe('unassigned');
      expect(mockPrisma.cityMembership.findUnique).not.toHaveBeenCalled();
    });

    it('rejects assigning a non-volunteer', async () => {
      mockPrisma.delivery.findFirst.mockResolvedValue(unassignedYosef);
      mockPrisma.cityMembership.findUnique.mockResolvedValue({
        role: 'coordinator',
        status: 'active',
        user: { archivedAt: null },
      });

      await expect(
        service.assign(
          CITY_A_ID,
          DAY_ID,
          DELIVERY_YOSEF_ID,
          { volunteerId: COORDINATOR_A_ID },
          coordinatorA()
        )
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockPrisma.delivery.updateMany).not.toHaveBeenCalled();
    });

    it('rejects reassignment after pickup', async () => {
      mockPrisma.delivery.findFirst.mockResolvedValue({
        ...assignedRivkah,
        status: 'picked',
      });
      mockPrisma.cityMembership.findUnique.mockResolvedValue({
        role: 'volunteer',
        status: 'active',
        user: { archivedAt: null },
      });
      mockPrisma.delivery.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.assign(
          CITY_A_ID,
          DAY_ID,
          DELIVERY_RIVKAH_ID,
          { volunteerId: VOLUNTEER_B_ID },
          coordinatorA()
        )
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockPrisma.delivery.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['unassigned', 'assigned'] },
          }),
        })
      );
      expect(mockPrisma.deliveryEvent.create).not.toHaveBeenCalled();
    });

    it('does not overwrite a concurrent pickup inside the transaction', async () => {
      mockPrisma.delivery.findFirst.mockResolvedValue(assignedRivkah);
      mockPrisma.cityMembership.findUnique.mockResolvedValue({
        role: 'volunteer',
        status: 'active',
        user: { archivedAt: null },
      });
      mockPrisma.delivery.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.assign(
          CITY_A_ID,
          DAY_ID,
          DELIVERY_RIVKAH_ID,
          { volunteerId: VOLUNTEER_B_ID },
          coordinatorA()
        )
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockPrisma.delivery.update).not.toHaveBeenCalled();
      expect(mockPrisma.deliveryEvent.create).not.toHaveBeenCalled();
    });

    it('hides assign from a volunteer', async () => {
      await expect(
        service.assign(
          CITY_A_ID,
          DAY_ID,
          DELIVERY_RIVKAH_ID,
          { volunteerId: VOLUNTEER_B_ID },
          volunteerA()
        )
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lets a super admin assign in any city', async () => {
      const assignedYosef = {
        ...unassignedYosef,
        volunteerId: VOLUNTEER_A_ID,
        status: 'assigned' as const,
        volunteer: assignedRivkah.volunteer,
      };
      mockPrisma.delivery.findFirst
        .mockResolvedValueOnce(unassignedYosef)
        .mockResolvedValueOnce(assignedYosef);
      mockPrisma.cityMembership.findUnique.mockResolvedValue({
        role: 'volunteer',
        status: 'active',
        user: { archivedAt: null },
      });
      mockPrisma.delivery.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.assign(
        CITY_A_ID,
        DAY_ID,
        DELIVERY_YOSEF_ID,
        { volunteerId: VOLUNTEER_A_ID },
        superAdmin()
      );

      expect(result.volunteerId).toBe(VOLUNTEER_A_ID);
    });

    it('hides another city from a coordinator', async () => {
      await expect(
        service.assign(
          CITY_A_ID,
          DAY_ID,
          DELIVERY_RIVKAH_ID,
          { volunteerId: VOLUNTEER_B_ID },
          coordinatorB()
        )
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(CITY_B_ID).toHaveLength(36);
    });
  });
});
