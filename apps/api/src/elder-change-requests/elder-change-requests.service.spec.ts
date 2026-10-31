import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AbilityFactory } from '../abilities/ability.factory';
import { PrismaService } from '../prisma/prisma.service';
import {
  CITY_A_ID,
  COORDINATOR_A_ID,
  VOLUNTEER_A_ID,
  coordinatorA,
  coordinatorB,
  pendingVolunteer,
  superAdmin,
  volunteerA,
  volunteerB,
} from '../test/fake-users';
import { ELDER_A_ID, fakeElder } from '../test/fake-elders';
import {
  CHANGE_REQUEST_A_ID,
  createChangeRequestPayload,
  fakeChangeRequest,
} from '../test/fake-change-requests';
import { ElderChangeRequestsService } from './elder-change-requests.service';

describe('ElderChangeRequestsService', () => {
  let service: ElderChangeRequestsService;

  const city = {
    id: CITY_A_ID,
    timezone: 'Asia/Jerusalem',
    archivedAt: null,
  };
  const elderA = fakeElder();
  const requestA = fakeChangeRequest();
  const approvedRequest = fakeChangeRequest({
    status: 'approved',
    reviewedById: COORDINATOR_A_ID,
    reviewedAt: new Date('2026-10-31T10:00:00.000Z'),
    elder: fakeElder({
      street: '4 Park Ave',
      notes: 'Entrance is on the side',
    }),
  });

  const mockPrisma = {
    city: { findUnique: vi.fn() },
    elder: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    elderContact: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    elderChangeRequest: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findFirstOrThrow: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    match: { findFirst: vi.fn() },
    delivery: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  };

  beforeEach(async () => {
    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mockPrisma) => Promise<unknown>) =>
        callback(mockPrisma)
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElderChangeRequestsService,
        AbilityFactory,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(ElderChangeRequestsService);
    vi.clearAllMocks();
    mockPrisma.city.findUnique.mockResolvedValue(city);
    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mockPrisma) => Promise<unknown>) =>
        callback(mockPrisma)
    );
    mockPrisma.elder.findFirst.mockResolvedValue(elderA);
    mockPrisma.match.findFirst.mockResolvedValue({ id: 'match-1' });
    mockPrisma.delivery.findFirst.mockResolvedValue(null);
    mockPrisma.elderChangeRequest.findMany.mockResolvedValue([requestA]);
    mockPrisma.elderChangeRequest.findFirst.mockResolvedValue(requestA);
    mockPrisma.elderChangeRequest.findFirstOrThrow.mockResolvedValue(requestA);
    mockPrisma.elderChangeRequest.create.mockResolvedValue(requestA);
    mockPrisma.elderChangeRequest.updateMany.mockResolvedValue({ count: 1 });
  });

  describe('list', () => {
    it('returns pending requests with current elder values for a coordinator', async () => {
      const result = await service.list(CITY_A_ID, {}, coordinatorA());

      expect(result.changeRequests).toHaveLength(1);
      expect(result.changeRequests[0]).toMatchObject({
        id: CHANGE_REQUEST_A_ID,
        status: 'pending',
        reason: 'Moved within Holon',
        changes: {
          street: { from: '1 Test Street', to: '4 Park Ave' },
        },
        elder: {
          id: ELDER_A_ID,
          fullName: 'Elder A',
          street: '1 Test Street',
        },
        requestedBy: {
          id: VOLUNTEER_A_ID,
          firstName: 'Yonatan',
        },
      });
      expect(mockPrisma.elderChangeRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { cityId: CITY_A_ID, status: 'pending' },
        })
      );
    });

    it('returns only the volunteer own requests and does not default to pending', async () => {
      await service.list(CITY_A_ID, {}, volunteerA());

      expect(mockPrisma.elderChangeRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { cityId: CITY_A_ID, requestedById: VOLUNTEER_A_ID },
        })
      );
    });

    it('lets a volunteer filter their own requests by status', async () => {
      await service.list(CITY_A_ID, { status: 'approved' }, volunteerA());

      expect(mockPrisma.elderChangeRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            cityId: CITY_A_ID,
            requestedById: VOLUNTEER_A_ID,
            status: 'approved',
          },
        })
      );
    });

    it('hides another city from a coordinator', async () => {
      await expect(
        service.list(CITY_A_ID, {}, coordinatorB())
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('forbids a pending member', async () => {
      await expect(
        service.list(CITY_A_ID, {}, pendingVolunteer())
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('get', () => {
    it('returns one request for the volunteer who submitted it', async () => {
      const result = await service.get(
        CITY_A_ID,
        CHANGE_REQUEST_A_ID,
        volunteerA()
      );

      expect(result.id).toBe(CHANGE_REQUEST_A_ID);
      expect(mockPrisma.elderChangeRequest.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: CHANGE_REQUEST_A_ID,
            cityId: CITY_A_ID,
            requestedById: VOLUNTEER_A_ID,
          },
        })
      );
    });

    it('hides another volunteer request', async () => {
      mockPrisma.elderChangeRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.get(CITY_A_ID, CHANGE_REQUEST_A_ID, volunteerB())
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockPrisma.elderChangeRequest.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: CHANGE_REQUEST_A_ID,
            cityId: CITY_A_ID,
            requestedById: volunteerB().id,
          },
        })
      );
    });
  });

  describe('create', () => {
    it('creates a request for an assigned volunteer and supersedes older pending ones', async () => {
      const result = await service.create(
        CITY_A_ID,
        createChangeRequestPayload() as never,
        volunteerA()
      );

      expect(result.id).toBe(CHANGE_REQUEST_A_ID);
      expect(mockPrisma.elderChangeRequest.updateMany).toHaveBeenCalledWith({
        where: { cityId: CITY_A_ID, elderId: ELDER_A_ID, status: 'pending' },
        data: { status: 'superseded' },
      });
      expect(mockPrisma.elderChangeRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cityId: CITY_A_ID,
            elderId: ELDER_A_ID,
            requestedById: VOLUNTEER_A_ID,
            reason: 'Moved within Holon',
            changes: {
              street: { from: '1 Test Street', to: '4 Park Ave' },
              notes: { from: null, to: 'Entrance is on the side' },
            },
          }),
        })
      );
    });

    it('allows a volunteer assigned only through a current published delivery', async () => {
      mockPrisma.match.findFirst.mockResolvedValue(null);
      mockPrisma.delivery.findFirst.mockResolvedValue({ id: 'delivery-1' });

      await service.create(
        CITY_A_ID,
        createChangeRequestPayload() as never,
        volunteerA()
      );

      expect(mockPrisma.delivery.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            cityId: CITY_A_ID,
            elderId: ELDER_A_ID,
            volunteerId: VOLUNTEER_A_ID,
            status: { notIn: ['unassigned', 'cancelled'] },
          }),
        })
      );
      expect(mockPrisma.elderChangeRequest.create).toHaveBeenCalled();
    });

    it('hides an elder that is not assigned to the volunteer', async () => {
      mockPrisma.match.findFirst.mockResolvedValue(null);
      mockPrisma.delivery.findFirst.mockResolvedValue(null);

      await expect(
        service.create(
          CITY_A_ID,
          createChangeRequestPayload() as never,
          volunteerA()
        )
      ).rejects.toMatchObject({
        message: 'elders.not_found',
      });
      expect(mockPrisma.elderChangeRequest.create).not.toHaveBeenCalled();
    });

    it('rejects a patch with no actual field changes', async () => {
      await expect(
        service.create(
          CITY_A_ID,
          createChangeRequestPayload({
            changes: { street: '1 Test Street' },
          }) as never,
          volunteerA()
        )
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects empty proposed changes', async () => {
      await expect(
        service.create(
          CITY_A_ID,
          createChangeRequestPayload({ changes: {} }) as never,
          volunteerA()
        )
      ).rejects.toMatchObject({ message: 'change_requests.empty' });
    });

    it('rejects unsafe fields such as buildingCode', async () => {
      await expect(
        service.create(
          CITY_A_ID,
          createChangeRequestPayload({
            changes: { street: '4 Park Ave', buildingCode: '9999' },
          }) as never,
          volunteerA()
        )
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('forbids a coordinator from creating a change request', async () => {
      await expect(
        service.create(
          CITY_A_ID,
          createChangeRequestPayload() as never,
          coordinatorA()
        )
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lets a super admin create without an assignment check', async () => {
      mockPrisma.match.findFirst.mockResolvedValue(null);
      mockPrisma.delivery.findFirst.mockResolvedValue(null);

      await service.create(
        CITY_A_ID,
        createChangeRequestPayload() as never,
        superAdmin()
      );

      expect(mockPrisma.match.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.elderChangeRequest.create).toHaveBeenCalled();
    });
  });

  describe('approve', () => {
    it('applies proposed elder fields and records the reviewer', async () => {
      mockPrisma.elderChangeRequest.findFirstOrThrow.mockResolvedValue(
        approvedRequest
      );

      const result = await service.approve(
        CITY_A_ID,
        CHANGE_REQUEST_A_ID,
        coordinatorA()
      );

      expect(result.status).toBe('approved');
      expect(result.elder.street).toBe('4 Park Ave');
      expect(mockPrisma.elderChangeRequest.updateMany).toHaveBeenCalledWith({
        where: {
          id: CHANGE_REQUEST_A_ID,
          cityId: CITY_A_ID,
          status: 'pending',
        },
        data: expect.objectContaining({
          status: 'approved',
          reviewedById: COORDINATOR_A_ID,
          reviewNote: null,
        }),
      });
      expect(mockPrisma.elder.update).toHaveBeenCalledWith({
        where: { id: ELDER_A_ID },
        data: {
          street: '4 Park Ave',
          notes: 'Entrance is on the side',
        },
      });
    });

    it('replaces next-of-kin contacts when they are part of the request', async () => {
      const withContacts = fakeChangeRequest({
        changes: {
          contacts: {
            from: [
              {
                id: '14141414-1414-4141-8141-141414141414',
                name: 'Contact 1',
                relation: 'child',
                phone: '+972500000001',
                isPrimary: true,
              },
            ],
            to: [
              {
                name: 'Dana Abraham',
                relation: 'child',
                phone: '+972507777777',
                isPrimary: true,
              },
            ],
          },
        },
      });
      mockPrisma.elderChangeRequest.findFirst.mockResolvedValue(withContacts);
      mockPrisma.elderChangeRequest.findFirstOrThrow.mockResolvedValue({
        ...withContacts,
        status: 'approved',
        reviewedById: COORDINATOR_A_ID,
        reviewedAt: new Date('2026-10-31T10:00:00.000Z'),
      });

      await service.approve(CITY_A_ID, CHANGE_REQUEST_A_ID, coordinatorA());

      expect(mockPrisma.elderContact.deleteMany).toHaveBeenCalledWith({
        where: { elderId: ELDER_A_ID, cityId: CITY_A_ID },
      });
      expect(mockPrisma.elderContact.createMany).toHaveBeenCalledWith({
        data: [
          {
            elderId: ELDER_A_ID,
            cityId: CITY_A_ID,
            name: 'Dana Abraham',
            relation: 'child',
            phone: '+972507777777',
            isPrimary: true,
          },
        ],
      });
    });

    it('rejects a request that is no longer pending', async () => {
      mockPrisma.elderChangeRequest.findFirst.mockResolvedValue({
        ...requestA,
        status: 'rejected',
      });

      await expect(
        service.approve(CITY_A_ID, CHANGE_REQUEST_A_ID, coordinatorA())
      ).rejects.toMatchObject({ message: 'change_requests.not_pending' });
    });

    it('forbids a volunteer from approving', async () => {
      await expect(
        service.approve(CITY_A_ID, CHANGE_REQUEST_A_ID, volunteerA())
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('reject', () => {
    it('rejects a pending request with an optional reason and leaves the elder unchanged', async () => {
      const rejected = fakeChangeRequest({
        status: 'rejected',
        reviewedById: COORDINATOR_A_ID,
        reviewedAt: new Date('2026-10-31T10:00:00.000Z'),
        reviewNote: 'Please call the Holon office first',
      });
      mockPrisma.elderChangeRequest.findFirstOrThrow.mockResolvedValue(
        rejected
      );

      const result = await service.reject(
        CITY_A_ID,
        CHANGE_REQUEST_A_ID,
        { reviewNote: 'Please call the Holon office first' },
        coordinatorA()
      );

      expect(result.status).toBe('rejected');
      expect(result.reviewNote).toBe('Please call the Holon office first');
      expect(mockPrisma.elder.update).not.toHaveBeenCalled();
      expect(mockPrisma.elderChangeRequest.updateMany).toHaveBeenCalledWith({
        where: {
          id: CHANGE_REQUEST_A_ID,
          cityId: CITY_A_ID,
          status: 'pending',
        },
        data: expect.objectContaining({
          status: 'rejected',
          reviewedById: COORDINATOR_A_ID,
          reviewNote: 'Please call the Holon office first',
        }),
      });
    });

    it('hides another city from a coordinator', async () => {
      await expect(
        service.reject(CITY_A_ID, CHANGE_REQUEST_A_ID, {}, coordinatorB())
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
