import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { PrismaService } from '../src/prisma/prisma.service';

describe.skipIf(!process.env.DATABASE_URL)(
  'Schema constraints (connected database)',
  () => {
    let app: INestApplication;
    let prisma: PrismaService;

    beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      configureApp(app);
      await app.init();

      prisma = app.get<PrismaService>(PrismaService);
    });

    afterAll(async () => {
      await app.close();
    });

    afterEach(async () => {
      // Clean up test data after each test
      await prisma.$executeRaw`TRUNCATE TABLE "city_invites", "city_memberships", "distribution_days", "matches", "elders", "users", "cities" CASCADE`;
    });

    it('enforces unique (cityId, date) on DistributionDay', async () => {
      // Create fake city and user
      const city = await prisma.city.create({
        data: {
          slug: 'test-city-01',
          nameHe: 'עיר בדיקה',
          nameEn: 'Test City',
        },
      });

      const user = await prisma.user.create({
        data: {
          firstName: 'Test',
          lastName: 'Coordinator',
          phone: '+972501234567',
        },
      });

      // Create first distribution day
      await prisma.distributionDay.create({
        data: {
          cityId: city.id,
          date: new Date('2026-11-15'),
          startTime: new Date('1970-01-01T09:00:00Z'),
          endTime: new Date('1970-01-01T14:00:00Z'),
          createdById: user.id,
        },
      });

      // Attempt to create duplicate distribution day for same city and date
      await expect(
        prisma.distributionDay.create({
          data: {
            cityId: city.id,
            date: new Date('2026-11-15'),
            startTime: new Date('1970-01-01T10:00:00Z'),
            endTime: new Date('1970-01-01T15:00:00Z'),
            createdById: user.id,
          },
        })
      ).rejects.toThrow(/unique constraint/i);
    });

    it('enforces one active CityInvite per (cityId, role)', async () => {
      // Create fake city and user
      const city = await prisma.city.create({
        data: {
          slug: 'test-city-02',
          nameHe: 'עיר בדיקה שתיים',
          nameEn: 'Test City Two',
        },
      });

      const user = await prisma.user.create({
        data: {
          firstName: 'Test',
          lastName: 'Admin',
          phone: '+972501234568',
        },
      });

      // Create first active invite for coordinator role
      await prisma.cityInvite.create({
        data: {
          cityId: city.id,
          role: 'coordinator',
          tokenHash: 'fake-hash-001',
          createdById: user.id,
        },
      });

      // Attempt to create second active invite for same city and role
      await expect(
        prisma.cityInvite.create({
          data: {
            cityId: city.id,
            role: 'coordinator',
            tokenHash: 'fake-hash-002',
            createdById: user.id,
          },
        })
      ).rejects.toThrow(/unique constraint/i);

      // But can create invite with different role
      await expect(
        prisma.cityInvite.create({
          data: {
            cityId: city.id,
            role: 'volunteer',
            tokenHash: 'fake-hash-003',
            createdById: user.id,
          },
        })
      ).resolves.toBeDefined();
    });

    it('allows second active CityInvite after revoking first one', async () => {
      // Create fake city and user
      const city = await prisma.city.create({
        data: {
          slug: 'test-city-03',
          nameHe: 'עיר בדיקה שלוש',
          nameEn: 'Test City Three',
        },
      });

      const user = await prisma.user.create({
        data: {
          firstName: 'Test',
          lastName: 'Coordinator',
          phone: '+972501234569',
        },
      });

      // Create first active invite
      const firstInvite = await prisma.cityInvite.create({
        data: {
          cityId: city.id,
          role: 'volunteer',
          tokenHash: 'fake-hash-004',
          createdById: user.id,
        },
      });

      // Revoke it
      await prisma.cityInvite.update({
        where: { id: firstInvite.id },
        data: { revokedAt: new Date() },
      });

      // Now can create second invite for same city and role
      await expect(
        prisma.cityInvite.create({
          data: {
            cityId: city.id,
            role: 'volunteer',
            tokenHash: 'fake-hash-005',
            createdById: user.id,
          },
        })
      ).resolves.toBeDefined();
    });

    it('enforces one current permanent Match per elder', async () => {
      // Create fake city, elder, and volunteers
      const city = await prisma.city.create({
        data: {
          slug: 'test-city-04',
          nameHe: 'עיר בדיקה ארבע',
          nameEn: 'Test City Four',
        },
      });

      const elder = await prisma.elder.create({
        data: {
          cityId: city.id,
          fullName: 'זקן בדיקה',
          street: 'רחוב בדיקה',
          houseNumber: '1',
        },
      });

      const volunteer1 = await prisma.user.create({
        data: {
          firstName: 'מתנדב',
          lastName: 'אחד',
          phone: '+972501234570',
        },
      });

      const volunteer2 = await prisma.user.create({
        data: {
          firstName: 'מתנדב',
          lastName: 'שתיים',
          phone: '+972501234571',
        },
      });

      // Create first current permanent match
      await prisma.match.create({
        data: {
          cityId: city.id,
          elderId: elder.id,
          volunteerId: volunteer1.id,
          type: 'permanent',
          startsAt: new Date('2026-11-01'),
        },
      });

      // Attempt to create second current permanent match
      await expect(
        prisma.match.create({
          data: {
            cityId: city.id,
            elderId: elder.id,
            volunteerId: volunteer2.id,
            type: 'permanent',
            startsAt: new Date('2026-11-01'),
          },
        })
      ).rejects.toThrow(/unique constraint/i);

      // But can create one_time match
      await expect(
        prisma.match.create({
          data: {
            cityId: city.id,
            elderId: elder.id,
            volunteerId: volunteer2.id,
            type: 'one_time',
            startsAt: new Date('2026-11-01'),
          },
        })
      ).resolves.toBeDefined();
    });

    it('allows second permanent Match after ending first one', async () => {
      // Create fake city, elder, and volunteers
      const city = await prisma.city.create({
        data: {
          slug: 'test-city-05',
          nameHe: 'עיר בדיקה חמש',
          nameEn: 'Test City Five',
        },
      });

      const elder = await prisma.elder.create({
        data: {
          cityId: city.id,
          fullName: 'זקנה בדיקה',
          street: 'רחוב בדיקה',
          houseNumber: '2',
        },
      });

      const volunteer1 = await prisma.user.create({
        data: {
          firstName: 'מתנדבת',
          lastName: 'אחת',
          phone: '+972501234572',
        },
      });

      const volunteer2 = await prisma.user.create({
        data: {
          firstName: 'מתנדבת',
          lastName: 'שתיים',
          phone: '+972501234573',
        },
      });

      // Create first permanent match
      const firstMatch = await prisma.match.create({
        data: {
          cityId: city.id,
          elderId: elder.id,
          volunteerId: volunteer1.id,
          type: 'permanent',
          startsAt: new Date('2026-10-01'),
        },
      });

      // End it
      await prisma.match.update({
        where: { id: firstMatch.id },
        data: {
          endsAt: new Date('2026-10-31'),
          endReason: 'reassigned',
        },
      });

      // Now can create second permanent match
      await expect(
        prisma.match.create({
          data: {
            cityId: city.id,
            elderId: elder.id,
            volunteerId: volunteer2.id,
            type: 'permanent',
            startsAt: new Date('2026-11-01'),
          },
        })
      ).resolves.toBeDefined();
    });

    it('enforces unique (key, locale) for global MessageTemplates', async () => {
      // Create first global template
      await prisma.messageTemplate.create({
        data: {
          key: 'day_invite',
          locale: 'he',
          title: 'הזמנה ליום חלוקה',
          body: 'שלום {{name}}',
        },
      });

      // Attempt to create duplicate global template
      await expect(
        prisma.messageTemplate.create({
          data: {
            key: 'day_invite',
            locale: 'he',
            title: 'הזמנה אחרת',
            body: 'היי {{name}}',
          },
        })
      ).rejects.toThrow(/unique constraint/i);

      // But can create template with different locale
      await expect(
        prisma.messageTemplate.create({
          data: {
            key: 'day_invite',
            locale: 'en',
            title: 'Day Invitation',
            body: 'Hello {{name}}',
          },
        })
      ).resolves.toBeDefined();
    });

    it('allows city-specific MessageTemplate even when global exists', async () => {
      // Create fake city
      const city = await prisma.city.create({
        data: {
          slug: 'test-city-06',
          nameHe: 'עיר בדיקה שש',
          nameEn: 'Test City Six',
        },
      });

      // Create global template
      await prisma.messageTemplate.create({
        data: {
          key: 'confirm_reminder',
          locale: 'he',
          title: 'תזכורת גלובלית',
          body: 'נא לאשר',
        },
      });

      // Can create city-specific override
      await expect(
        prisma.messageTemplate.create({
          data: {
            cityId: city.id,
            key: 'confirm_reminder',
            locale: 'he',
            title: 'תזכורת עירונית',
            body: 'נא לאשר בעיר שלך',
          },
        })
      ).resolves.toBeDefined();
    });
  }
);
