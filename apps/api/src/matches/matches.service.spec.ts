import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { AbilityFactory } from '../abilities/ability.factory';
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
  MATCH_A_ID,
  createMatchPayload,
  fakeMatch,
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

  const matchA = fakeMatch();
  const unmatchedElder = {
    id: ELDER_B_ID,
    fullName: 'Elder B',
    status: 'active' as const,
  };
  const volunteerSummary = fakeVolunteerUser();

  const mockPrisma = {
    city: { findUnique: vi.fn() },
    match: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findFirstOrThrow: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    elder: { findMany: vi.fn(), findFirst: vi.fn() },
    user: { findMany: vi.fn(), findFirst: vi.fn() },
    $transaction: vi.fn(),
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
      ],
    }).compile();

    service = module.get(MatchesService);
    vi.clearAllMocks();
    mockPrisma.city.findUnique.mockResolvedValue(city);
    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mockPrisma) => Promise<unknown>) =>
        callback(mockPrisma)
    );
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
        })
      );

      await expect(
        service.create(CITY_A_ID, createMatchPayload() as never, coordinatorA())
      ).rejects.toBeInstanceOf(ConflictException);
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
          endsAt: new Date('2026-10-31T00:00:00.000Z'),
          endReason: 'reassigned',
        })
      );

      const result = await service.end(
        CITY_A_ID,
        MATCH_A_ID,
        { endReason: 'reassigned', endsAt: '2026-10-31' },
        coordinatorA()
      );

      expect(result.endsAt).toBe('2026-10-31');
      expect(result.endReason).toBe('reassigned');
      expect(mockPrisma.match.updateMany).toHaveBeenCalledWith({
        where: {
          id: MATCH_A_ID,
          cityId: CITY_A_ID,
          type: 'permanent',
          endsAt: null,
        },
        data: {
          endsAt: new Date('2026-10-31T00:00:00.000Z'),
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
});
