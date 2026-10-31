import { describe, expect, it } from 'vitest';
import {
  elderMapsSearchQuery,
  locationHintsText,
  localizedCityName,
  mapsDeepLinks,
  mapsQueryFromFreeText,
  mapsSearchQuery,
} from './navigation-links';

describe('mapsSearchQuery', () => {
  it('builds a Holon search from street, number, and city', () => {
    expect(
      mapsSearchQuery({
        street: '12 Example St',
        houseNumber: '12',
        city: 'Holon',
      })
    ).toBe('12 Example St 12, Holon');
  });

  it('omits blank parts and returns null without a street or number', () => {
    expect(
      mapsSearchQuery({
        street: '  ',
        houseNumber: '',
        city: 'Holon',
      })
    ).toBeNull();
    expect(
      mapsSearchQuery({
        street: '8 Weizmann St',
        houseNumber: '  ',
        city: '',
      })
    ).toBe('8 Weizmann St');
  });

  it('does not put entrance or building code in the query', () => {
    const query = mapsSearchQuery({
      street: '12 Example St',
      houseNumber: '12',
      city: 'Holon',
    });
    expect(query).toBe('12 Example St 12, Holon');
    expect(query).not.toContain('Entrance');
    expect(query).not.toContain('1234');
  });
});

describe('mapsQueryFromFreeText', () => {
  it('uses the Holon distribution center address as-is', () => {
    expect(mapsQueryFromFreeText('  10 Warehouse Rd, Holon  ')).toBe(
      '10 Warehouse Rd, Holon'
    );
  });

  it('returns null when the center address is missing', () => {
    expect(mapsQueryFromFreeText('')).toBeNull();
    expect(mapsQueryFromFreeText('   ')).toBeNull();
  });
});

describe('mapsDeepLinks', () => {
  it('builds free Google Maps, Apple Maps, and Waze URLs', () => {
    const links = mapsDeepLinks('12 Example St 12, Holon');
    const encoded = encodeURIComponent('12 Example St 12, Holon');

    expect(links.google).toBe(
      `https://www.google.com/maps/dir/?api=1&destination=${encoded}`
    );
    expect(links.apple).toBe(`https://maps.apple.com/?daddr=${encoded}`);
    expect(links.waze).toBe(`https://waze.com/ul?q=${encoded}&navigate=yes`);
    expect(links.google).not.toContain('key=');
    expect(links.apple).not.toContain('key=');
    expect(links.waze).not.toContain('key=');
  });

  it('keeps extra location text out of encoded URLs', () => {
    const links = mapsDeepLinks('12 Example St 12, Holon');
    expect(links.google).not.toContain('Entrance');
    expect(links.waze).not.toContain('1234');
  });
});

describe('elderMapsSearchQuery', () => {
  it('hides navigation when the elder has no usable street or number', () => {
    expect(
      elderMapsSearchQuery({ street: '', houseNumber: '  ' }, 'Holon')
    ).toBeNull();
  });
});

describe('locationHintsText', () => {
  it('shows entrance and building code as visible text only', () => {
    expect(
      locationHintsText(
        { entrance: 'B', buildingCode: '1234' },
        { entrance: 'Entrance', buildingCode: 'Code' }
      )
    ).toBe('Entrance B, Code 1234');
  });

  it('omits empty optional hints', () => {
    expect(
      locationHintsText(
        { entrance: null, buildingCode: null },
        { entrance: 'Entrance', buildingCode: 'Code' }
      )
    ).toBe('');
  });
});

describe('localizedCityName', () => {
  it('prefers the active language and falls back to the other name', () => {
    expect(localizedCityName('חולון', 'Holon', 'he')).toBe('חולון');
    expect(localizedCityName('חולון', 'Holon', 'en')).toBe('Holon');
    expect(localizedCityName('', 'Holon', 'he')).toBe('Holon');
    expect(localizedCityName('חולון', '  ', 'en')).toBe('חולון');
  });
});
