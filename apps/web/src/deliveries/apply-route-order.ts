import type { VolunteerDayRoute, VolunteerDelivery } from '@giving-day/shared';
import type { VolunteerDayRouteResponseDto } from '../api/generated/api';

export interface RouteStopMeta {
  visitOrder: number | null;
  placed: boolean;
}

export function applyRouteOrder(
  deliveries: readonly VolunteerDelivery[],
  route:
    Pick<VolunteerDayRoute | VolunteerDayRouteResponseDto, 'stops'> | undefined
): VolunteerDelivery[] {
  if (route === undefined || route.stops.length === 0) {
    return [...deliveries];
  }

  const remaining = new Map(
    deliveries.map((delivery) => [delivery.id, delivery])
  );
  const ordered: VolunteerDelivery[] = [];

  for (const stop of route.stops) {
    const delivery = remaining.get(stop.deliveryId);
    if (delivery === undefined) {
      continue;
    }
    ordered.push(delivery);
    remaining.delete(stop.deliveryId);
  }

  for (const leftover of remaining.values()) {
    ordered.push(leftover);
  }

  return ordered;
}

export function routeMetaByDeliveryId(
  route:
    Pick<VolunteerDayRoute | VolunteerDayRouteResponseDto, 'stops'> | undefined
): ReadonlyMap<string, RouteStopMeta> {
  const meta = new Map<string, RouteStopMeta>();
  if (route === undefined) {
    return meta;
  }
  for (const stop of route.stops) {
    meta.set(stop.deliveryId, {
      visitOrder: stop.visitOrder,
      placed: stop.placed,
    });
  }
  return meta;
}
