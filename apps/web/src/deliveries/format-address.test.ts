import { describe, expect, it } from 'vitest';
import { formatElderDetails, formatElderStreet } from './format-address';

const elder = {
  id: '12121212-1212-4121-8121-121212121212',
  fullName: 'Rivkah Levi',
  street: '12 Example St',
  houseNumber: '12',
  entrance: 'B',
  floor: '3',
  apartment: '7',
  addressNotes: 'Knock loudly',
  notes: 'Entrance is around the back',
};

describe('formatElderStreet', () => {
  it('joins street and house number', () => {
    expect(formatElderStreet(elder)).toBe('12 Example St 12');
  });
});

describe('formatElderDetails', () => {
  it('includes entrance, floor, and apartment when present', () => {
    expect(
      formatElderDetails(elder, {
        entrance: 'Entrance',
        floor: 'Floor',
        apartment: 'Apt',
      })
    ).toBe('Entrance B, Floor 3, Apt 7');
  });

  it('omits empty optional parts', () => {
    expect(
      formatElderDetails(
        { ...elder, entrance: null, floor: null, apartment: null },
        { entrance: 'Entrance', floor: 'Floor', apartment: 'Apt' }
      )
    ).toBe('');
  });
});
