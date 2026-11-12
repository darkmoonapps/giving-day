import { describe, expect, it } from 'vitest';
import {
  EMPTY_VOLUNTEER_LIST_FILTERS,
  hasActiveVolunteerFilters,
  volunteerDisplayName,
  volunteerListParams,
} from './volunteer-list-query';

describe('volunteerListParams', () => {
  it('omits empty filters', () => {
    expect(volunteerListParams(EMPTY_VOLUNTEER_LIST_FILTERS)).toEqual({});
  });

  it('maps membership status, search, and day response filters', () => {
    expect(
      volunteerListParams({
        status: 'pending',
        search: '  Yonatan Bar  ',
        dayId: '55555555-5555-4555-8555-555555555555',
        dayResponse: 'confirmed',
      })
    ).toEqual({
      status: 'pending',
      search: 'Yonatan Bar',
      dayId: '55555555-5555-4555-8555-555555555555',
      dayResponse: 'confirmed',
    });
  });

  it('ignores day response when no day is selected', () => {
    expect(
      volunteerListParams({
        ...EMPTY_VOLUNTEER_LIST_FILTERS,
        dayResponse: 'declined',
      })
    ).toEqual({});
  });
});

describe('hasActiveVolunteerFilters', () => {
  it('detects non-default filters', () => {
    expect(hasActiveVolunteerFilters(EMPTY_VOLUNTEER_LIST_FILTERS)).toBe(false);
    expect(
      hasActiveVolunteerFilters({
        ...EMPTY_VOLUNTEER_LIST_FILTERS,
        search: 'Dana',
      })
    ).toBe(true);
    expect(
      hasActiveVolunteerFilters({
        ...EMPTY_VOLUNTEER_LIST_FILTERS,
        status: 'active',
      })
    ).toBe(true);
  });
});

describe('volunteerDisplayName', () => {
  it('joins names and falls back when blank', () => {
    expect(volunteerDisplayName('Yonatan', 'Bar', 'Volunteer')).toBe(
      'Yonatan Bar'
    );
    expect(volunteerDisplayName(null, null, 'Volunteer')).toBe('Volunteer');
  });
});
