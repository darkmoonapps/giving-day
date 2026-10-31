import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { configureApp } from '../configure-app';
import { PrismaService } from '../prisma/prisma.service';
import { DeliveriesService } from './deliveries.service';

describe.skipIf(!process.env.DATABASE_URL)(
  'DeliveriesService.prefillFromPermanentMatches (connected database)',
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let deliveries: DeliveriesService;

    beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      configureApp(app);
      await app.init();

      prisma = app.get<PrismaService>(PrismaService);
      deliveries = app.get<DeliveriesService>(DeliveriesService);
    });

    afterAll(async () => {
      await app.close();
    });

    afterEach(async () => {
      await prisma.$executeRaw`TRUNCATE TABLE "delivery_events", "deliveries", "matches", "city_memberships", "distribution_days", "elders", "users", "cities" CASCADE`;
    });

    it('prefills assigned matches and unassigned active elders without duplicating rows', async () => {
      const fixture = await seedHolonPrefillFixture(prisma);

      const firstCount = await prisma.$transaction((tx) =>
        deliveries.prefillFromPermanentMatches(tx, {
          cityId: fixture.cityId,
          dayId: fixture.dayId,
          actorId: fixture.coordinatorId,
        })
      );

      const secondCount = await prisma.$transaction((tx) =>
        deliveries.prefillFromPermanentMatches(tx, {
          cityId: fixture.cityId,
          dayId: fixture.dayId,
          actorId: fixture.coordinatorId,
        })
      );

      const rows = await prisma.delivery.findMany({
        where: { cityId: fixture.cityId, dayId: fixture.dayId },
        orderBy: { elder: { fullName: 'asc' } },
      });
      const events = await prisma.deliveryEvent.findMany({
        where: { delivery: { dayId: fixture.dayId } },
      });

      expect(firstCount).toBe(2);
      expect(secondCount).toBe(0);
      expect(rows).toHaveLength(2);
      expect(rows.map((row) => row.elderId).sort()).toEqual(
        [fixture.matchedElderId, fixture.unmatchedElderId].sort()
      );
      expect(
        rows.find((row) => row.elderId === fixture.matchedElderId)
      ).toMatchObject({
        volunteerId: fixture.volunteerId,
        matchId: fixture.matchId,
        status: 'assigned',
      });
      expect(
        rows.find((row) => row.elderId === fixture.unmatchedElderId)
      ).toMatchObject({
        volunteerId: null,
        matchId: null,
        status: 'unassigned',
      });
      expect(rows.some((row) => row.elderId === fixture.archivedElderId)).toBe(
        false
      );
      expect(rows.some((row) => row.elderId === fixture.pausedElderId)).toBe(
        false
      );
      expect(rows.some((row) => row.elderId === fixture.otherCityElderId)).toBe(
        false
      );
      expect(events).toHaveLength(2);
    });

    it('stays race-safe when two prefills run at once', async () => {
      const fixture = await seedHolonPrefillFixture(prisma);
      const params = {
        cityId: fixture.cityId,
        dayId: fixture.dayId,
        actorId: fixture.coordinatorId,
      };

      await Promise.all([
        prisma.$transaction((tx) =>
          deliveries.prefillFromPermanentMatches(tx, params)
        ),
        prisma.$transaction((tx) =>
          deliveries.prefillFromPermanentMatches(tx, params)
        ),
      ]);

      const rows = await prisma.delivery.findMany({
        where: { cityId: fixture.cityId, dayId: fixture.dayId },
      });
      const elderIds = rows.map((row) => row.elderId);

      expect(rows).toHaveLength(2);
      expect(new Set(elderIds).size).toBe(2);
    });
  }
);

interface HolonPrefillFixture {
  cityId: string;
  dayId: string;
  coordinatorId: string;
  volunteerId: string;
  matchId: string;
  matchedElderId: string;
  unmatchedElderId: string;
  archivedElderId: string;
  pausedElderId: string;
  otherCityElderId: string;
}

async function seedHolonPrefillFixture(
  prisma: PrismaService
): Promise<HolonPrefillFixture> {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const city = await prisma.city.create({
    data: {
      slug: `holon-prefill-${suffix}`,
      nameHe: 'חולון',
      nameEn: 'Holon',
    },
  });
  const otherCity = await prisma.city.create({
    data: {
      slug: `other-prefill-${suffix}`,
      nameHe: 'עיר אחרת',
      nameEn: 'Other City',
    },
  });

  const coordinator = await prisma.user.create({
    data: {
      firstName: 'Noa',
      lastName: 'Levi',
      phone: '+972501111111',
      email: `noa.levi.${suffix}@example.com`,
    },
  });
  const volunteer = await prisma.user.create({
    data: {
      firstName: 'Yonatan',
      lastName: 'Bar',
      phone: '+972502222222',
      email: `yonatan.bar.${suffix}@example.com`,
    },
  });

  await prisma.cityMembership.create({
    data: {
      cityId: city.id,
      userId: volunteer.id,
      role: 'volunteer',
      status: 'active',
    },
  });

  const matchedElder = await prisma.elder.create({
    data: {
      cityId: city.id,
      fullName: 'Rivkah Levi',
      street: '12 Example St',
      houseNumber: '12',
      status: 'active',
    },
  });
  const unmatchedElder = await prisma.elder.create({
    data: {
      cityId: city.id,
      fullName: 'Yosef Abraham',
      street: '4 Park Ave',
      houseNumber: '4',
      status: 'active',
    },
  });
  const archivedElder = await prisma.elder.create({
    data: {
      cityId: city.id,
      fullName: 'Shlomo Katz',
      street: '9 Archive Rd',
      houseNumber: '9',
      status: 'active',
      archivedAt: new Date('2026-09-01T09:00:00.000Z'),
    },
  });
  const pausedElder = await prisma.elder.create({
    data: {
      cityId: city.id,
      fullName: 'Hannah Mizrahi',
      street: '3 Hospital St',
      houseNumber: '3',
      status: 'hospitalized',
    },
  });
  const otherCityElder = await prisma.elder.create({
    data: {
      cityId: otherCity.id,
      fullName: 'Dina Azulay',
      street: '1 Other St',
      houseNumber: '1',
      status: 'active',
    },
  });

  const match = await prisma.match.create({
    data: {
      cityId: city.id,
      elderId: matchedElder.id,
      volunteerId: volunteer.id,
      type: 'permanent',
      startsAt: new Date('2026-10-01'),
    },
  });

  const day = await prisma.distributionDay.create({
    data: {
      cityId: city.id,
      date: new Date('2026-11-15'),
      startTime: new Date('1970-01-01T09:00:00Z'),
      endTime: new Date('1970-01-01T14:00:00Z'),
      createdById: coordinator.id,
    },
  });

  return {
    cityId: city.id,
    dayId: day.id,
    coordinatorId: coordinator.id,
    volunteerId: volunteer.id,
    matchId: match.id,
    matchedElderId: matchedElder.id,
    unmatchedElderId: unmatchedElder.id,
    archivedElderId: archivedElder.id,
    pausedElderId: pausedElder.id,
    otherCityElderId: otherCityElder.id,
  };
}
