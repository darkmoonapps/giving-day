import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { AbilityFactory } from '../abilities/ability.factory';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CITY_A_ID,
  VOLUNTEER_A_ID,
  coordinatorA,
  coordinatorB,
  pendingVolunteer,
  superAdmin,
  volunteerA,
} from '../test/fake-users';
import { ELDER_A_ID, ELDER_B_ID, fakeElder } from '../test/fake-elders';
import {
  DAY_A_ID,
  DAY_DATE,
  MATCH_A_ID,
  MATCH_ONE_TIME_ID,
  createMatchPayload,
  createOneTimeMatchPayload,
  fakeMatch,
  fakeOneTimeMatch,
  fakeVolunteerUser,
} from '../test/fake-matches';
import { MatchesService } from './matches.service';

describe('MatchesService', () => {
  let service: MatchesService;

  const city = {
    id: CITY_A_ID,
    timezone: 'Asia/Jerusalem',
    archivedAt: null,
  };

  const publishedDay = {
    id: DAY_A_ID,
    cityId: CITY_A_ID,
    date: DAY_DATE,
    status: 'published' as const,
  };

  const matchA = fakeMatch();
  const oneTimeMatch = fakeOneTimeMatch();
  const unmatchedElder = {
    id: ELDER_B_ID,
    fullName: 'Elder B',
    status: 'active' as const,
  };
  const volunteerSummary = fakeVolunteerUser();

  const mockPrisma = {
    city: { findUnique: vi.fn() },
    distributionDay: { findFirst: vi.fn() },
    match: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findFirstOrThrow: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    elder: { findMany: vi.fn(), findFirst: vi.fn() },
    user: { findMany: vi.fn(), findFirst: vi.fn() },
    dayParticipation: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    delivery: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
    deliveryEvent: { create: vi.fn() },
    $transaction: vi.fn(),
  };

  const mockAuditLogs = {
    record: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mockPrisma) => Promise<unknown>) =>
        callback(mockPrisma)
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchesService,
        AbilityFactory,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: AuditLogsService,
          useValue: mockAuditLogs,
        },
      ],
    }).compile();

    service = module.get(MatchesService);
    vi.clearAllMocks();
    mockPrisma.city.findUnique.mockResolvedValue(city);
    mockPrisma.distributionDay.findFirst.mockResolvedValue(publishedDay);
    mockPrisma.delivery.findFirst.mockResolvedValue(null);
    mockPrisma.delivery.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.deliveryEvent.create.mockResolvedValue({});
    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mockPrisma) => Promise<unknown>) =>
        callback(mockPrisma)
    );
    mockAuditLogs.record.mockResolvedValue(undefined);
  });

  describe('list', () => {
    it('returns current permanent matches with elder and volunteer summaries', async () => {
      mockPrisma.match.findMany.mockResolvedValue([matchA]);
      mockPrisma.elder.findMany.mockResolvedValue([unmatchedElder]);
      mockPrisma.user.findMany.mockResolvedValue([volunteerSummary]);

      const result = await service.list(CITY_A_ID, coordinatorA());

      expect(result.matches).toHaveLength(1);
      expect(result.matches[0]).toMatchObject({
        id: MATCH_A_ID,
        type: 'permanent',
        startsAt: '2026-10-01',
        endsAt: null,
        elder: { id: ELDER_A_ID, fullName: 'Elder A', status: 'active' },
        volunteer: {
          id: VOLUNTEER_A_ID,
          firstName: 'Yonatan',
          lastName: 'Bar',
        },
      });
      expect(result.unmatchedElders).toEqual([unmatchedElder]);
      expect(result.matchableVolunteers[0]).toMatchObject({
        id: VOLUNTEER_A_ID,
        firstName: 'Yonatan',
      });
      expect(mockPrisma.match.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { cityId: CITY_A_ID, type: 'permanent', endsAt: null },
        })
      );
    });

    it('allows a super admin', async () => {
      mockPrisma.match.findMany.mockResolvedValue([]);
      mockPrisma.elder.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);

      await expect(service.list(CITY_A_ID, superAdmin())).resolves.toEqual({
        matches: [],
        unmatchedElders: [],
        matchableVolunteers: [],
      });
    });

    it('forbids a volunteer from listing city matches', async () => {
      await expect(
        service.list(CITY_A_ID, volunteerA())
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('hides another city from a coordinator', async () => {
      await expect(
        service.list(CITY_A_ID, coordinatorB())
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    beforeEach(() => {
      mockPrisma.elder.findFirst.mockResolvedValue({
        id: ELDER_A_ID,
        status: 'active',
      });
      mockPrisma.user.findFirst.mockResolvedValue(volunteerSummary);
      mockPrisma.match.findFirst.mockResolvedValue(null);
      mockPrisma.match.create.mockResolvedValue(matchA);
    });

    it('creates a permanent match for an active elder and approved volunteer', async () => {
      const result = await service.create(
        CITY_A_ID,
        createMatchPayload({ startsAt: '2026-10-01' }) as never,
        coordinatorA()
      );

      expect(result.id).toBe(MATCH_A_ID);
      expect(mockPrisma.match.create).toHaveBeenCalledWith({
        data: {
          cityId: CITY_A_ID,
          elderId: ELDER_A_ID,
          volunteerId: VOLUNTEER_A_ID,
          type: 'permanent',
          startsAt: new Date('2026-10-01T00:00:00.000Z'),
        },
        include: expect.any(Object),
      });
      expect(mockAuditLogs.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'match.create',
          entity: 'match',
          entityId: MATCH_A_ID,
          diff: expect.objectContaining({
            type: 'permanent',
            elderId: ELDER_A_ID,
            volunteerId: VOLUNTEER_A_ID,
          }),
        }),
        mockPrisma
      );
    });

    it('returns 409 when the elder already has a current permanent match', async () => {
      mockPrisma.match.findFirst.mockResolvedValue({ id: MATCH_A_ID });

      await expect(
        service.create(CITY_A_ID, createMatchPayload() as never, coordinatorA())
      ).rejects.toMatchObject({
        constructor: ConflictException,
        message: 'matches.elder_already_matched',
      });
    });

    it('returns 409 when the unique index rejects a race', async () => {
      mockPrisma.match.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique', {
          code: 'P2002',
          clientVersion: '6.1.0',
          meta: { target: ['matches_elderId_current_permanent'] },
        })
      );

      await expect(
        service.create(CITY_A_ID, createMatchPayload() as never, coordinatorA())
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rethrows a P2002 from a different unique constraint', async () => {
      const otherConflict = new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: '6.1.0',
        meta: { target: ['Match_id_key'] },
      });
      mockPrisma.match.create.mockRejectedValue(otherConflict);

      await expect(
        service.create(CITY_A_ID, createMatchPayload() as never, coordinatorA())
      ).rejects.toBe(otherConflict);
    });

    it('rejects a paused elder', async () => {
      mockPrisma.elder.findFirst.mockResolvedValue(
        fakeElder({ status: 'paused', contacts: [] })
      );

      await expect(
        service.create(CITY_A_ID, createMatchPayload() as never, coordinatorA())
      ).rejects.toMatchObject({
        constructor: BadRequestException,
        message: 'matches.elder_not_active',
      });
    });

    it('rejects a volunteer who is not an approved city member', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.create(CITY_A_ID, createMatchPayload() as never, coordinatorA())
      ).rejects.toMatchObject({
        constructor: BadRequestException,
        message: 'matches.invalid_volunteer',
      });
    });

    it('returns 404 when the elder is missing from the city', async () => {
      mockPrisma.elder.findFirst.mockResolvedValue(null);

      await expect(
        service.create(CITY_A_ID, createMatchPayload() as never, coordinatorA())
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('hides another city from a coordinator', async () => {
      await expect(
        service.create(CITY_A_ID, createMatchPayload() as never, coordinatorB())
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockPrisma.match.create).not.toHaveBeenCalled();
    });

    it('forbids a volunteer from creating a match', async () => {
      await expect(
        service.create(CITY_A_ID, createMatchPayload() as never, volunteerA())
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('end', () => {
    it('ends a current permanent match', async () => {
      mockPrisma.match.findFirst.mockResolvedValue(matchA);
      mockPrisma.match.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.match.findFirstOrThrow.mockResolvedValue(
        fakeMatch({
          endsAt: new Date('2026-10-15T00:00:00.000Z'),
          endReason: 'reassigned',
        })
      );

      const result = await service.end(
        CITY_A_ID,
        MATCH_A_ID,
        { endReason: 'reassigned', endsAt: '2026-10-15' },
        coordinatorA()
      );

      expect(result.endsAt).toBe('2026-10-15');
      expect(result.endReason).toBe('reassigned');
      expect(mockPrisma.match.updateMany).toHaveBeenCalledWith({
        where: {
          id: MATCH_A_ID,
          cityId: CITY_A_ID,
          type: 'permanent',
          endsAt: null,
        },
        data: {
          endsAt: new Date('2026-10-15T00:00:00.000Z'),
          endReason: 'reassigned',
        },
      });
    });

    it('rejects ending a match that is already closed', async () => {
      mockPrisma.match.findFirst.mockResolvedValue(
        fakeMatch({
          endsAt: new Date('2026-10-15T00:00:00.000Z'),
          endReason: 'other',
        })
      );

      await expect(
        service.end(
          CITY_A_ID,
          MATCH_A_ID,
          { endReason: 'reassigned' },
          coordinatorA()
        )
      ).rejects.toMatchObject({
        constructor: BadRequestException,
        message: 'matches.already_ended',
      });
    });

    it('rejects an end date before the start date', async () => {
      mockPrisma.match.findFirst.mockResolvedValue(matchA);

      await expect(
        service.end(
          CITY_A_ID,
          MATCH_A_ID,
          { endReason: 'other', endsAt: '2026-09-01' },
          coordinatorA()
        )
      ).rejects.toMatchObject({
        constructor: BadRequestException,
        message: 'matches.invalid_end_date',
      });
    });

    it('rejects a future end date so the match is not still current', async () => {
      mockPrisma.match.findFirst.mockResolvedValue(matchA);

      await expect(
        service.end(
          CITY_A_ID,
          MATCH_A_ID,
          { endReason: 'other', endsAt: '2099-01-01' },
          coordinatorA()
        )
      ).rejects.toMatchObject({
        constructor: BadRequestException,
        message: 'matches.future_end_date',
      });
      expect(mockPrisma.match.updateMany).not.toHaveBeenCalled();
    });

    it('returns 404 when the match is missing', async () => {
      mockPrisma.match.findFirst.mockResolvedValue(null);

      await expect(
        service.end(
          CITY_A_ID,
          MATCH_A_ID,
          { endReason: 'other' },
          coordinatorA()
        )
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('forbids a pending member', async () => {
      await expect(
        service.end(
          CITY_A_ID,
          MATCH_A_ID,
          { endReason: 'other' },
          pendingVolunteer()
        )
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('listOneTime', () => {
    it('returns current one-time matches for a day', async () => {
      mockPrisma.distributionDay.findFirst.mockResolvedValue(publishedDay);
      mockPrisma.match.findMany.mockResolvedValue([oneTimeMatch]);
      mockPrisma.elder.findMany.mockResolvedValue([unmatchedElder]);
      mockPrisma.dayParticipation.findMany.mockResolvedValue([
        { volunteer: volunteerSummary },
      ]);

      const result = await service.listOneTime(
        CITY_A_ID,
        DAY_A_ID,
        coordinatorA()
      );

      expect(result.matches).toHaveLength(1);
      expect(result.matches[0]).toMatchObject({
        id: MATCH_ONE_TIME_ID,
        type: 'one_time',
        dayId: DAY_A_ID,
        startsAt: '2026-11-12',
      });
      expect(result.availableElders).toEqual([unmatchedElder]);
      expect(result.matchableVolunteers).toEqual([
        {
          id: volunteerSummary.id,
          firstName: volunteerSummary.firstName,
          lastName: volunteerSummary.lastName,
        },
      ]);
      expect(mockPrisma.match.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            cityId: CITY_A_ID,
            dayId: DAY_A_ID,
            type: 'one_time',
            endsAt: null,
          },
        })
      );
      expect(mockPrisma.dayParticipation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            cityId: CITY_A_ID,
            dayId: DAY_A_ID,
            status: 'confirmed',
          }),
        })
      );
      expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
    });

    it('forbids a volunteer from listing one-time matches', async () => {
      await expect(
        service.listOneTime(CITY_A_ID, DAY_A_ID, volunteerA())
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('createOneTime', () => {
    beforeEach(() => {
      mockPrisma.distributionDay.findFirst.mockResolvedValue(publishedDay);
      mockPrisma.elder.findFirst.mockResolvedValue({
        id: ELDER_A_ID,
        status: 'active',
      });
      mockPrisma.dayParticipation.findFirst.mockResolvedValue({
        volunteerId: VOLUNTEER_A_ID,
      });
      mockPrisma.match.findFirst.mockResolvedValue(null);
      mockPrisma.match.create.mockResolvedValue(oneTimeMatch);
      mockPrisma.delivery.findFirst.mockResolvedValue({
        id: '77777777-7777-4777-8777-777777777777',
        status: 'unassigned',
        volunteerId: null,
      });
      mockPrisma.delivery.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.deliveryEvent.create.mockResolvedValue({});
    });

    it('creates a one-time match and assigns the day delivery', async () => {
      const result = await service.createOneTime(
        CITY_A_ID,
        DAY_A_ID,
        createOneTimeMatchPayload() as never,
        coordinatorA()
      );

      expect(result).toMatchObject({
        id: MATCH_ONE_TIME_ID,
        type: 'one_time',
        dayId: DAY_A_ID,
      });
      expect(mockPrisma.dayParticipation.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            cityId: CITY_A_ID,
            dayId: DAY_A_ID,
            volunteerId: VOLUNTEER_A_ID,
            status: 'confirmed',
          }),
        })
      );
      expect(mockPrisma.match.create).toHaveBeenCalledWith({
        data: {
          cityId: CITY_A_ID,
          elderId: ELDER_A_ID,
          volunteerId: VOLUNTEER_A_ID,
          type: 'one_time',
          dayId: DAY_A_ID,
          startsAt: DAY_DATE,
        },
        include: expect.any(Object),
      });
      expect(mockPrisma.delivery.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            volunteerId: VOLUNTEER_A_ID,
            matchId: MATCH_ONE_TIME_ID,
            status: 'assigned',
          }),
        })
      );
      expect(mockPrisma.deliveryEvent.create).toHaveBeenCalled();
    });

    it('rejects a volunteer who has not confirmed for the day', async () => {
      mockPrisma.dayParticipation.findFirst.mockResolvedValue(null);

      await expect(
        service.createOneTime(
          CITY_A_ID,
          DAY_A_ID,
          createOneTimeMatchPayload() as never,
          coordinatorA()
        )
      ).rejects.toMatchObject({
        constructor: BadRequestException,
        message: 'matches.volunteer_not_confirmed',
      });
      expect(mockPrisma.match.create).not.toHaveBeenCalled();
    });

    it('returns 409 when the elder already has a one-time match for the day', async () => {
      mockPrisma.match.findFirst.mockResolvedValue({ id: MATCH_ONE_TIME_ID });

      await expect(
        service.createOneTime(
          CITY_A_ID,
          DAY_A_ID,
          createOneTimeMatchPayload() as never,
          coordinatorA()
        )
      ).rejects.toMatchObject({
        constructor: ConflictException,
        message: 'matches.elder_already_matched_for_day',
      });
    });

    it('rejects a closed day', async () => {
      mockPrisma.distributionDay.findFirst.mockResolvedValue({
        ...publishedDay,
        status: 'closed',
      });

      await expect(
        service.createOneTime(
          CITY_A_ID,
          DAY_A_ID,
          createOneTimeMatchPayload() as never,
          coordinatorA()
        )
      ).rejects.toMatchObject({
        constructor: BadRequestException,
        message: 'matches.day_not_editable',
      });
    });

    it('forbids a volunteer from creating a one-time match', async () => {
      await expect(
        service.createOneTime(
          CITY_A_ID,
          DAY_A_ID,
          createOneTimeMatchPayload() as never,
          volunteerA()
        )
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('endOneTime', () => {
    it('ends a one-time match and unassigns the linked delivery', async () => {
      mockPrisma.distributionDay.findFirst.mockResolvedValue(publishedDay);
      mockPrisma.match.findFirst.mockResolvedValue(oneTimeMatch);
      mockPrisma.match.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.match.findFirstOrThrow.mockResolvedValue(
        fakeOneTimeMatch({
          endsAt: DAY_DATE,
          endReason: 'reassigned',
        })
      );
      mockPrisma.delivery.findFirst.mockResolvedValue({
        id: '77777777-7777-4777-8777-777777777777',
        status: 'assigned',
        volunteerId: VOLUNTEER_A_ID,
        matchId: MATCH_ONE_TIME_ID,
      });
      mockPrisma.delivery.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.deliveryEvent.create.mockResolvedValue({});

      const result = await service.endOneTime(
        CITY_A_ID,
        DAY_A_ID,
        MATCH_ONE_TIME_ID,
        { endReason: 'reassigned' },
        coordinatorA()
      );

      expect(result.endsAt).toBe('2026-11-12');
      expect(result.endReason).toBe('reassigned');
      expect(mockPrisma.delivery.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            volunteerId: null,
            matchId: null,
            status: 'unassigned',
            assignedAt: null,
          },
        })
      );
    });

    it('returns 404 when the one-time match is missing for the day', async () => {
      mockPrisma.distributionDay.findFirst.mockResolvedValue(publishedDay);
      mockPrisma.match.findFirst.mockResolvedValue(null);

      await expect(
        service.endOneTime(
          CITY_A_ID,
          DAY_A_ID,
          MATCH_ONE_TIME_ID,
          { endReason: 'other' },
          coordinatorA()
        )
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
