import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { AbilityFactory } from '../abilities/ability.factory';
import { PrismaService } from '../prisma/prisma.service';
import {
  CITY_A_ID,
  coordinatorA,
  coordinatorB,
  pendingVolunteer,
  superAdmin,
  volunteerA,
} from '../test/fake-users';
import {
  ELDER_A_ID,
  ELDER_B_ID,
  createElderPayload,
  fakeElder,
  fakeElderContact,
} from '../test/fake-elders';
import { EldersService } from './elders.service';

describe('EldersService', () => {
  let service: EldersService;

  const city = {
    id: CITY_A_ID,
    archivedAt: null,
    slug: 'test-city',
    nameHe: 'עיר בדיקה',
    nameEn: 'Test City',
  };

  const elderA = fakeElder();
  const elderB = fakeElder({
    id: ELDER_B_ID,
    fullName: 'Elder B',
    phone: null,
    contacts: [],
  });
  const archivedElder = fakeElder({
    archivedAt: new Date('2026-10-20T09:00:00.000Z'),
    status: 'removed',
    contacts: [],
  });

  const mockPrisma = {
    city: { findUnique: vi.fn() },
    elder: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    elderContact: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  beforeEach(async () => {
    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mockPrisma) => Promise<unknown>) =>
        callback(mockPrisma)
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EldersService,
        AbilityFactory,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(EldersService);
    vi.clearAllMocks();
    mockPrisma.city.findUnique.mockResolvedValue(city);
    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mockPrisma) => Promise<unknown>) =>
        callback(mockPrisma)
    );
  });

  describe('list', () => {
    it('returns city elders with next-of-kin contacts for a coordinator', async () => {
      mockPrisma.elder.findMany.mockResolvedValue([elderA, elderB]);

      const result = await service.list(CITY_A_ID, {}, coordinatorA());

      expect(result.elders).toHaveLength(2);
      expect(result.elders[0]).toMatchObject({
        id: ELDER_A_ID,
        fullName: 'Elder A',
        contacts: [
          expect.objectContaining({
            name: 'Contact 1',
            relation: 'child',
            phone: '+972500000001',
            isPrimary: true,
          }),
        ],
      });
      expect(mockPrisma.elder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { cityId: CITY_A_ID, archivedAt: null },
        })
      );
    });

    it('filters by status and can include archived elders', async () => {
      mockPrisma.elder.findMany.mockResolvedValue([archivedElder]);

      await service.list(
        CITY_A_ID,
        { status: 'removed', includeArchived: true },
        coordinatorA()
      );

      expect(mockPrisma.elder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            cityId: CITY_A_ID,
            status: 'removed',
          },
        })
      );
    });

    it('allows a super admin', async () => {
      mockPrisma.elder.findMany.mockResolvedValue([]);
      await expect(service.list(CITY_A_ID, {}, superAdmin())).resolves.toEqual({
        elders: [],
      });
    });

    it('forbids a volunteer from listing elders', async () => {
      await expect(
        service.list(CITY_A_ID, {}, volunteerA())
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('hides another city from a coordinator', async () => {
      await expect(
        service.list(CITY_A_ID, {}, coordinatorB())
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('get', () => {
    it('returns one elder including contacts', async () => {
      mockPrisma.elder.findFirst.mockResolvedValue(elderA);

      const result = await service.get(CITY_A_ID, ELDER_A_ID, coordinatorA());

      expect(result.id).toBe(ELDER_A_ID);
      expect(result.contacts[0]?.name).toBe('Contact 1');
    });

    it('returns 404 when the elder is missing', async () => {
      mockPrisma.elder.findFirst.mockResolvedValue(null);

      await expect(
        service.get(CITY_A_ID, ELDER_A_ID, coordinatorA())
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates an elder and next-of-kin contacts', async () => {
      const created = fakeElder();
      mockPrisma.elder.create.mockResolvedValue(created);
      mockPrisma.elder.findUniqueOrThrow.mockResolvedValue(created);

      const result = await service.create(
        CITY_A_ID,
        createElderPayload({
          phone: '050-0000010',
          contacts: [
            {
              name: 'Contact 1',
              relation: 'child',
              phone: '050-0000001',
              isPrimary: true,
            },
          ],
        }) as never,
        coordinatorA()
      );

      expect(result.fullName).toBe('Elder A');
      expect(mockPrisma.elder.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cityId: CITY_A_ID,
          fullName: 'Elder A',
          phone: '+972500000010',
          street: '1 Test Street',
          houseNumber: '1',
          status: 'active',
          geocodeStatus: 'pending',
        }),
      });
      expect(mockPrisma.elderContact.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            cityId: CITY_A_ID,
            name: 'Contact 1',
            phone: '+972500000001',
            isPrimary: true,
          }),
        ],
      });
    });

    it('sets geocodeStatus to manual when coordinates are provided', async () => {
      mockPrisma.elder.create.mockResolvedValue(elderB);
      mockPrisma.elder.findUniqueOrThrow.mockResolvedValue(elderB);

      await service.create(
        CITY_A_ID,
        createElderPayload({
          contacts: [],
          lat: 32.01,
          lng: 34.77,
        }) as never,
        coordinatorA()
      );

      expect(mockPrisma.elder.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          lat: 32.01,
          lng: 34.77,
          geocodeStatus: 'manual',
        }),
      });
    });

    it('rejects two primary contacts', async () => {
      await expect(
        service.create(
          CITY_A_ID,
          createElderPayload({
            contacts: [
              {
                name: 'Contact 1',
                relation: 'child',
                phone: '+972500000001',
                isPrimary: true,
              },
              {
                name: 'Contact 2',
                relation: 'neighbor',
                phone: '+972500000002',
                isPrimary: true,
              },
            ],
          }) as never,
          coordinatorA()
        )
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an invalid phone', async () => {
      await expect(
        service.create(
          CITY_A_ID,
          createElderPayload({ phone: 'not-a-phone' }) as never,
          coordinatorA()
        )
      ).rejects.toMatchObject({ message: 'elders.invalid_phone' });
    });

    it('forbids a volunteer from creating elders', async () => {
      await expect(
        service.create(CITY_A_ID, createElderPayload() as never, volunteerA())
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates fields and replaces contacts', async () => {
      const updated = fakeElder({
        notes: 'Knock loudly',
        contacts: [
          fakeElderContact({
            name: 'Contact 2',
            relation: 'neighbor',
            phone: '+972500000002',
          }),
        ],
      });
      mockPrisma.elder.findFirst.mockResolvedValue(elderA);
      mockPrisma.elder.update.mockResolvedValue(updated);
      mockPrisma.elder.findUniqueOrThrow.mockResolvedValue(updated);

      const result = await service.update(
        CITY_A_ID,
        ELDER_A_ID,
        {
          notes: 'Knock loudly',
          contacts: [
            {
              name: 'Contact 2',
              relation: 'neighbor',
              phone: '+972500000002',
              isPrimary: true,
            },
          ],
        },
        coordinatorA()
      );

      expect(result.notes).toBe('Knock loudly');
      expect(mockPrisma.elderContact.deleteMany).toHaveBeenCalledWith({
        where: { elderId: ELDER_A_ID, cityId: CITY_A_ID },
      });
      expect(mockPrisma.elderContact.createMany).toHaveBeenCalled();
    });

    it('returns 404 when the elder is in another city', async () => {
      mockPrisma.elder.findFirst.mockResolvedValue(null);

      await expect(
        service.update(CITY_A_ID, ELDER_A_ID, { notes: 'x' }, coordinatorA())
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('deactivate', () => {
    it('archives the elder and sets status to removed', async () => {
      const deactivated = fakeElder({
        archivedAt: new Date('2026-10-31T09:00:00.000Z'),
        status: 'removed',
      });
      mockPrisma.elder.findFirst.mockResolvedValue(elderA);
      mockPrisma.elder.update.mockResolvedValue(deactivated);

      const result = await service.deactivate(
        CITY_A_ID,
        ELDER_A_ID,
        coordinatorA()
      );

      expect(result.status).toBe('removed');
      expect(result.archivedAt).toBe('2026-10-31T09:00:00.000Z');
      expect(mockPrisma.elder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: ELDER_A_ID },
          data: expect.objectContaining({
            status: 'removed',
            archivedAt: expect.any(Date),
          }),
        })
      );
    });

    it('rejects a second deactivate', async () => {
      mockPrisma.elder.findFirst.mockResolvedValue(archivedElder);

      await expect(
        service.deactivate(CITY_A_ID, ELDER_A_ID, coordinatorA())
      ).rejects.toMatchObject({ message: 'elders.already_deactivated' });
    });

    it('forbids a pending member', async () => {
      await expect(
        service.deactivate(CITY_A_ID, ELDER_A_ID, pendingVolunteer())
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  it('converts stored coordinates to numbers', async () => {
    mockPrisma.elder.findFirst.mockResolvedValue(
      fakeElder({
        lat: new Prisma.Decimal('32.011400'),
        lng: new Prisma.Decimal('34.774800'),
        geocodeStatus: 'ok',
      })
    );

    const result = await service.get(CITY_A_ID, ELDER_A_ID, coordinatorA());
    expect(result.lat).toBe(32.0114);
    expect(result.lng).toBe(34.7748);
  });
});
