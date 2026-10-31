import type { DeliveryElder, LanguageCode } from '@giving-day/shared';

export interface MapsSearchAddress {
  street: string;
  houseNumber: string;
  city: string;
}

export interface MapsDeepLinks {
  google: string;
  apple: string;
  waze: string;
}

export interface LocationHintLabels {
  entrance: string;
  buildingCode: string;
}

export function trimAddressPart(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  return value.trim();
}

export function localizedCityName(
  cityNameHe: string,
  cityNameEn: string,
  language: LanguageCode
): string {
  const hebrew = trimAddressPart(cityNameHe);
  const english = trimAddressPart(cityNameEn);
  if (language === 'en') {
    return english.length > 0 ? english : hebrew;
  }
  return hebrew.length > 0 ? hebrew : english;
}

export function mapsSearchQuery(address: MapsSearchAddress): string | null {
  const street = trimAddressPart(address.street);
  const houseNumber = trimAddressPart(address.houseNumber);
  const city = trimAddressPart(address.city);
  const streetLine = [street, houseNumber]
    .filter((part) => part.length > 0)
    .join(' ');
  if (streetLine.length === 0) {
    return null;
  }
  return city.length > 0 ? `${streetLine}, ${city}` : streetLine;
}

export function mapsQueryFromFreeText(address: string): string | null {
  const trimmed = trimAddressPart(address);
  return trimmed.length > 0 ? trimmed : null;
}

export function elderMapsSearchQuery(
  elder: Pick<DeliveryElder, 'street' | 'houseNumber'>,
  cityName: string
): string | null {
  return mapsSearchQuery({
    street: elder.street,
    houseNumber: elder.houseNumber,
    city: cityName,
  });
}

export function locationHintsText(
  elder: Pick<DeliveryElder, 'entrance'> & { buildingCode?: string | null },
  labels: LocationHintLabels
): string {
  const parts: string[] = [];
  const entrance = trimAddressPart(elder.entrance);
  const buildingCode = trimAddressPart(elder.buildingCode);
  if (entrance.length > 0) {
    parts.push(`${labels.entrance} ${entrance}`);
  }
  if (buildingCode.length > 0) {
    parts.push(`${labels.buildingCode} ${buildingCode}`);
  }
  return parts.join(', ');
}

export function mapsDeepLinks(query: string): MapsDeepLinks {
  const encoded = encodeURIComponent(query);
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${encoded}`,
    apple: `https://maps.apple.com/?daddr=${encoded}`,
    waze: `https://waze.com/ul?q=${encoded}&navigate=yes`,
  };
}
