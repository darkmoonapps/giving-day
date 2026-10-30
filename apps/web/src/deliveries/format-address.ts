import type { DeliveryElder } from '@giving-day/shared';

export function formatElderStreet(elder: DeliveryElder): string {
  return `${elder.street} ${elder.houseNumber}`.trim();
}

export function formatElderDetails(
  elder: DeliveryElder,
  labels: {
    entrance: string;
    floor: string;
    apartment: string;
  }
): string {
  const parts: string[] = [];
  if (elder.entrance !== null && elder.entrance.length > 0) {
    parts.push(`${labels.entrance} ${elder.entrance}`);
  }
  if (elder.floor !== null && elder.floor.length > 0) {
    parts.push(`${labels.floor} ${elder.floor}`);
  }
  if (elder.apartment !== null && elder.apartment.length > 0) {
    parts.push(`${labels.apartment} ${elder.apartment}`);
  }
  return parts.join(', ');
}
