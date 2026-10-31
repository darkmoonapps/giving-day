import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  buildGeocodeQuery,
  isUsableCoord,
  orderStopsNearestNeighbor,
  volunteerDayRouteSchema,
  type RouteCoord,
  type VolunteerDayRoute,
} from '@giving-day/shared';
import type { Prisma } from '@prisma/client';
import {
  AbilityFactory,
  type UserWithMemberships,
} from '../abilities/ability.factory';
import { assertCanOnCity } from '../cities/city-access';
import {
  GEOCODER,
  type GeocodeOutcome,
  type Geocoder,
} from '../geocoding/geocoding.tokens';
import { PrismaService } from '../prisma/prisma.service';

export const MAX_LIVE_GEOCODES_PER_REQUEST = 3;

interface LiveGeocodeBudget {
  remaining: number;
}

const ROUTE_ELDER_SELECT = {
  id: true,
  fullName: true,
  street: true,
  houseNumber: true,
  entrance: true,
  floor: true,
  apartment: true,
  addressNotes: true,
  notes: true,
  lat: true,
  lng: true,
  geocodeStatus: true,
  contacts: {
    select: {
      name: true,
      relation: true,
      phone: true,
      isPrimary: true,
    },
    orderBy: [{ isPrimary: 'desc' as const }, { name: 'asc' as const }],
  },
} satisfies Prisma.ElderSelect;

type RouteElder = Prisma.ElderGetPayload<{
  select: typeof ROUTE_ELDER_SELECT;
}>;

type RouteDelivery = Prisma.DeliveryGetPayload<{
  include: { elder: { select: typeof ROUTE_ELDER_SELECT } };
}>;

type CityRouteRecord = {
  id: string;
  archivedAt: Date | null;
  nameHe: string;
  nameEn: string;
  settings: {
    centerAddress: string;
    centerLat: Prisma.Decimal | number;
    centerLng: Prisma.Decimal | number;
  } | null;
};

@Injectable()
export class VolunteerRouteService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AbilityFactory) private readonly abilityFactory: AbilityFactory,
    @Inject(GEOCODER) private readonly geocoder: Geocoder
  ) {}

  async getOwnRoute(
    cityId: string,
    dayId: string,
    actor: UserWithMemberships
  ): Promise<VolunteerDayRoute> {
    const ability = this.abilityFactory.createForUser(actor);
    assertCanOnCity(ability, 'read', 'Delivery', cityId);
    const city = await this.requireCity(cityId);
    await this.requireDay(cityId, dayId);

    const participation = await this.prisma.dayParticipation.findUnique({
      where: {
        dayId_volunteerId: { dayId, volunteerId: actor.id },
      },
    });

    const confirmed =
      participation !== null &&
      participation.cityId === cityId &&
      participation.status === 'confirmed';

    const deliveries = confirmed
      ? await this.prisma.delivery.findMany({
          where: {
            cityId,
            dayId,
            volunteerId: actor.id,
            status: { not: 'cancelled' },
          },
          include: {
            elder: { select: ROUTE_ELDER_SELECT },
          },
        })
      : [];

    const cityNameEn = city.nameEn;
    const liveGeocodeBudget: LiveGeocodeBudget = {
      remaining: MAX_LIVE_GEOCODES_PER_REQUEST,
    };
    const center = await this.resolveCenter(city, liveGeocodeBudget);
    const resolvedStops = await this.resolveStops(
      deliveries,
      cityNameEn,
      liveGeocodeBudget
    );
    const ordered = orderStopsNearestNeighbor(
      center.placed ? { lat: center.lat ?? 0, lng: center.lng ?? 0 } : null,
      resolvedStops.map((stop) => ({
        id: stop.delivery.id,
        coord: stop.coord,
      }))
    );
    const byDeliveryId = new Map(
      resolvedStops.map((stop) => [stop.delivery.id, stop])
    );

    return volunteerDayRouteSchema.parse({
      dayId,
      cityId,
      cityNameHe: city.nameHe,
      cityNameEn,
      center,
      stops: ordered.map((item) => {
        const resolved = byDeliveryId.get(item.id);
        if (resolved === undefined) {
          throw new NotFoundException('deliveries.not_found');
        }
        return {
          deliveryId: resolved.delivery.id,
          visitOrder: item.visitOrder,
          placed: item.placed,
          lat: item.coord?.lat ?? null,
          lng: item.coord?.lng ?? null,
          status: resolved.delivery.status,
          elder: toRouteElder(resolved.delivery.elder),
        };
      }),
    });
  }

  private async requireCity(cityId: string): Promise<CityRouteRecord> {
    const city = await this.prisma.city.findUnique({
      where: { id: cityId },
      select: {
        id: true,
        archivedAt: true,
        nameHe: true,
        nameEn: true,
        settings: {
          select: {
            centerAddress: true,
            centerLat: true,
            centerLng: true,
          },
        },
      },
    });
    if (!city || city.archivedAt) {
      throw new NotFoundException('cities.not_found');
    }
    return city;
  }

  private async requireDay(cityId: string, dayId: string): Promise<void> {
    const day = await this.prisma.distributionDay.findFirst({
      where: { id: dayId, cityId },
      select: { id: true },
    });
    if (!day) {
      throw new NotFoundException('distribution_days.not_found');
    }
  }

  private async resolveCenter(
    city: CityRouteRecord,
    budget: LiveGeocodeBudget
  ): Promise<VolunteerDayRoute['center']> {
    const address = city.settings?.centerAddress.trim() ?? '';
    const stored = toCoord(
      city.settings?.centerLat ?? null,
      city.settings?.centerLng ?? null
    );
    if (isUsableCoord(stored)) {
      return {
        address,
        lat: stored.lat,
        lng: stored.lng,
        placed: true,
      };
    }

    if (address.length === 0) {
      return { address, lat: null, lng: null, placed: false };
    }

    const outcome = await this.liveGeocode(address, budget);
    if (outcome === null || outcome.kind !== 'hit') {
      return { address, lat: null, lng: null, placed: false };
    }

    await this.persistCenter(city.id, outcome.coord);
    return {
      address,
      lat: outcome.coord.lat,
      lng: outcome.coord.lng,
      placed: true,
    };
  }

  private async persistCenter(
    cityId: string,
    coord: RouteCoord
  ): Promise<void> {
    try {
      await this.prisma.citySettings.update({
        where: { cityId },
        data: {
          centerLat: coord.lat,
          centerLng: coord.lng,
        },
      });
    } catch {
      // Cache write is best-effort; the volunteer still gets the live coord.
    }
  }

  private async resolveStops(
    deliveries: RouteDelivery[],
    cityNameEn: string,
    budget: LiveGeocodeBudget
  ): Promise<Array<{ delivery: RouteDelivery; coord: RouteCoord | null }>> {
    const sorted = [...deliveries].sort((left, right) =>
      left.elder.fullName.localeCompare(right.elder.fullName, 'he')
    );
    const resolved: Array<{
      delivery: RouteDelivery;
      coord: RouteCoord | null;
    }> = [];

    for (const delivery of sorted) {
      resolved.push({
        delivery,
        coord: await this.resolveElderCoord(delivery.elder, cityNameEn, budget),
      });
    }

    return resolved;
  }

  private async resolveElderCoord(
    elder: RouteElder,
    cityNameEn: string,
    budget: LiveGeocodeBudget
  ): Promise<RouteCoord | null> {
    const stored = toCoord(elder.lat, elder.lng);
    if (
      isUsableCoord(stored) &&
      (elder.geocodeStatus === 'ok' || elder.geocodeStatus === 'manual')
    ) {
      return stored;
    }
    if (isUsableCoord(stored) && elder.geocodeStatus !== 'failed') {
      return stored;
    }
    if (elder.geocodeStatus === 'failed') {
      return null;
    }

    const query = buildGeocodeQuery(
      elder.street,
      elder.houseNumber,
      cityNameEn
    );
    if (query === null) {
      await this.persistElderGeocode(elder.id, null);
      return null;
    }

    const outcome = await this.liveGeocode(query, budget);
    if (outcome === null) {
      return null;
    }
    if (outcome.kind === 'hit') {
      await this.persistElderGeocode(elder.id, outcome.coord);
      return outcome.coord;
    }
    if (outcome.kind === 'no_hit') {
      await this.persistElderGeocode(elder.id, null);
      return null;
    }
    return null;
  }

  private async liveGeocode(
    query: string,
    budget: LiveGeocodeBudget
  ): Promise<GeocodeOutcome | null> {
    if (budget.remaining <= 0) {
      return null;
    }
    budget.remaining -= 1;
    return this.geocoder.geocode(query);
  }

  private async persistElderGeocode(
    elderId: string,
    coord: RouteCoord | null
  ): Promise<void> {
    try {
      await this.prisma.elder.update({
        where: { id: elderId },
        data:
          coord === null
            ? { geocodeStatus: 'failed' }
            : {
                lat: coord.lat,
                lng: coord.lng,
                geocodeStatus: 'ok',
              },
      });
    } catch {
      // Cache write is best-effort.
    }
  }
}

function toCoord(
  lat: Prisma.Decimal | number | null | undefined,
  lng: Prisma.Decimal | number | null | undefined
): RouteCoord | null {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return null;
  }
  const parsed = {
    lat: typeof lat === 'number' ? lat : lat.toNumber(),
    lng: typeof lng === 'number' ? lng : lng.toNumber(),
  };
  return isUsableCoord(parsed) ? parsed : null;
}

function toRouteElder(
  elder: RouteElder
): VolunteerDayRoute['stops'][number]['elder'] {
  return {
    id: elder.id,
    fullName: elder.fullName,
    street: elder.street,
    houseNumber: elder.houseNumber,
    entrance: elder.entrance,
    floor: elder.floor,
    apartment: elder.apartment,
    addressNotes: elder.addressNotes,
    notes: elder.notes,
    contacts: elder.contacts,
  };
}
