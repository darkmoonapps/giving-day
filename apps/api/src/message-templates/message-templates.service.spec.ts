import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { defaultMessageCopyFor } from '@giving-day/shared';
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
import { MessageTemplatesService } from './message-templates.service';

describe('MessageTemplatesService', () => {
  let service: MessageTemplatesService;

  const city = {
    id: CITY_A_ID,
    archivedAt: null,
    slug: 'holon',
    nameHe: 'חולון',
    nameEn: 'Holon',
  };

  const mockPrisma = {
    city: { findUnique: vi.fn() },
    messageTemplate: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageTemplatesService,
        AbilityFactory,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(MessageTemplatesService);
    vi.clearAllMocks();
    mockPrisma.city.findUnique.mockResolvedValue(city);
    mockPrisma.messageTemplate.findMany.mockResolvedValue([]);
    mockPrisma.messageTemplate.findFirst.mockResolvedValue(null);
  });

  describe('list', () => {
    it('returns default Holon templates for a coordinator when none are saved', async () => {
      const result = await service.list(CITY_A_ID, coordinatorA());

      expect(result.templates.length).toBeGreaterThan(0);
      const dayInviteHe = result.templates.find(
        (template) => template.key === 'day_invite' && template.locale === 'he'
      );
      const expected = defaultMessageCopyFor('day_invite', 'he');
      expect(dayInviteHe).toMatchObject({
        id: null,
        isCustom: false,
        title: expected.title,
        body: expected.body,
        defaultTitle: expected.title,
        defaultBody: expected.body,
        placeholders: ['date', 'startTime', 'endTime'],
      });
    });

    it('prefers a city override over defaults', async () => {
      mockPrisma.messageTemplate.findMany.mockImplementation(
        async ({
          where,
        }: {
          where: { cityId: string | null };
        }): Promise<
          Array<{
            id: string;
            cityId: string | null;
            key: 'day_invite';
            locale: 'he';
            title: string;
            body: string;
          }>
        > => {
          if (where.cityId === CITY_A_ID) {
            return [
              {
                id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
                cityId: CITY_A_ID,
                key: 'day_invite',
                locale: 'he',
                title: 'יום חלוקה בחולון',
                body: 'חולון: {{date}} {{startTime}}-{{endTime}}',
              },
            ];
          }
          return [];
        }
      );

      const result = await service.list(CITY_A_ID, coordinatorA());
      const dayInviteHe = result.templates.find(
        (template) => template.key === 'day_invite' && template.locale === 'he'
      );

      expect(dayInviteHe).toMatchObject({
        id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        isCustom: true,
        title: 'יום חלוקה בחולון',
        body: 'חולון: {{date}} {{startTime}}-{{endTime}}',
        defaultTitle: defaultMessageCopyFor('day_invite', 'he').title,
      });
    });

    it('hides another city from a coordinator', async () => {
      await expect(
        service.list(CITY_A_ID, coordinatorB())
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('forbids a volunteer', async () => {
      await expect(
        service.list(CITY_A_ID, volunteerA())
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('forbids a pending member', async () => {
      await expect(
        service.list(CITY_A_ID, pendingVolunteer())
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('allows a super admin', async () => {
      const result = await service.list(CITY_A_ID, superAdmin());
      expect(result.templates.length).toBeGreaterThan(0);
    });
  });

  describe('upsert', () => {
    it('saves a Holon city override', async () => {
      const saved = {
        id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        cityId: CITY_A_ID,
        key: 'day_invite' as const,
        locale: 'en' as const,
        title: 'Holon distribution day',
        body: 'Can you deliver in Holon on {{date}}?',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.messageTemplate.upsert.mockResolvedValue(saved);

      const result = await service.upsert(
        CITY_A_ID,
        'day_invite',
        'en',
        {
          title: 'Holon distribution day',
          body: 'Can you deliver in Holon on {{date}}?',
        },
        coordinatorA()
      );

      expect(mockPrisma.messageTemplate.upsert).toHaveBeenCalledWith({
        where: {
          cityId_key_locale: {
            cityId: CITY_A_ID,
            key: 'day_invite',
            locale: 'en',
          },
        },
        create: {
          cityId: CITY_A_ID,
          key: 'day_invite',
          locale: 'en',
          title: 'Holon distribution day',
          body: 'Can you deliver in Holon on {{date}}?',
        },
        update: {
          title: 'Holon distribution day',
          body: 'Can you deliver in Holon on {{date}}?',
        },
      });
      expect(result).toMatchObject({
        id: saved.id,
        isCustom: true,
        title: saved.title,
        body: saved.body,
      });
    });

    it('rejects an unknown template key', async () => {
      await expect(
        service.upsert(
          CITY_A_ID,
          'not_a_key',
          'he',
          { title: 'x', body: 'y' },
          coordinatorA()
        )
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects whitespace-only title or body', async () => {
      await expect(
        service.upsert(
          CITY_A_ID,
          'day_invite',
          'he',
          { title: '   ', body: 'valid body {{date}}' },
          coordinatorA()
        )
      ).rejects.toBeInstanceOf(BadRequestException);

      await expect(
        service.upsert(
          CITY_A_ID,
          'day_invite',
          'he',
          { title: 'valid title', body: '   ' },
          coordinatorA()
        )
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(mockPrisma.messageTemplate.upsert).not.toHaveBeenCalled();
    });

    it('rejects unknown placeholders', async () => {
      await expect(
        service.upsert(
          CITY_A_ID,
          'day_invite',
          'en',
          {
            title: 'Invite',
            body: 'Wrong {{dat}} and {{elderName}}',
          },
          coordinatorA()
        )
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(mockPrisma.messageTemplate.upsert).not.toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('deletes the city override and returns defaults', async () => {
      mockPrisma.messageTemplate.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.reset(
        CITY_A_ID,
        'day_invite',
        'he',
        coordinatorA()
      );

      expect(mockPrisma.messageTemplate.deleteMany).toHaveBeenCalledWith({
        where: { cityId: CITY_A_ID, key: 'day_invite', locale: 'he' },
      });
      expect(result).toMatchObject({
        id: null,
        isCustom: false,
        title: defaultMessageCopyFor('day_invite', 'he').title,
      });
    });
  });
});
