import { describe, expect, it } from 'vitest';
import {
  REPLACEMENT_SUGGESTION_LIMIT,
  proximityScore,
  rankReplacementSuggestions,
  type ReplacementVolunteerCandidate,
} from './replacement-suggestions';

const WEIZMANN_VOLUNTEER: ReplacementVolunteerCandidate = {
  id: '99999999-9999-4999-8999-999999999999',
  firstName: 'Dana',
  lastName: 'Levi',
  homeArea: 'Weizmann',
};

const PARK_VOLUNTEER: ReplacementVolunteerCandidate = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  firstName: 'Maya',
  lastName: 'Cohen',
  homeArea: 'Park',
};

const NEVE_EREZ_VOLUNTEER: ReplacementVolunteerCandidate = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  firstName: 'Yonatan',
  lastName: 'Bar',
  homeArea: 'Neve Erez',
};

const NO_AREA_VOLUNTEER: ReplacementVolunteerCandidate = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  firstName: 'Amit',
  lastName: 'Shalev',
  homeArea: null,
};

describe('proximityScore', () => {
  it('scores a home-area that appears in the elder street highest', () => {
    expect(
      proximityScore('Weizmann', {
        street: '8 Weizmann St',
        addressNotes: null,
      })
    ).toBe(3);
  });

  it('scores overlapping tokens when the full home-area is not a substring', () => {
    expect(
      proximityScore('Kiryat Rabin', {
        street: 'Rabin Blvd',
        addressNotes: null,
      })
    ).toBe(2);
  });

  it('matches Hebrew street names after stripping רחוב', () => {
    expect(
      proximityScore('ויצמן', {
        street: 'רחוב ויצמן',
        addressNotes: null,
      })
    ).toBe(3);
  });

  it('uses address notes when the street itself does not match', () => {
    expect(
      proximityScore('Weizmann', {
        street: '4 Park Ave',
        addressNotes: 'Near Weizmann',
      })
    ).toBe(3);
  });

  it('does not treat address stop-words as a street match', () => {
    expect(
      proximityScore('St', {
        street: '8 Weizmann St',
        addressNotes: null,
      })
    ).toBe(1);
  });

  it('scores a known home-area with no text match above a missing one', () => {
    expect(
      proximityScore('Neve Erez', {
        street: '8 Weizmann St',
        addressNotes: null,
      })
    ).toBe(1);
    expect(
      proximityScore(null, {
        street: '8 Weizmann St',
        addressNotes: null,
      })
    ).toBe(0);
  });
});

describe('rankReplacementSuggestions', () => {
  it('ranks confirmed volunteers by home-area proximity to the elder', () => {
    const ranked = rankReplacementSuggestions(
      { street: '8 Weizmann St', addressNotes: null },
      [
        NO_AREA_VOLUNTEER,
        NEVE_EREZ_VOLUNTEER,
        WEIZMANN_VOLUNTEER,
        PARK_VOLUNTEER,
      ]
    );

    expect(ranked.map((volunteer) => volunteer.id)).toEqual([
      WEIZMANN_VOLUNTEER.id,
      NEVE_EREZ_VOLUNTEER.id,
      PARK_VOLUNTEER.id,
      NO_AREA_VOLUNTEER.id,
    ]);
  });

  it('breaks remaining ties by last name then first name', () => {
    const ranked = rankReplacementSuggestions(
      { street: '8 Weizmann St', addressNotes: null },
      [
        { ...PARK_VOLUNTEER, lastName: 'Zohar', firstName: 'Maya' },
        { ...NEVE_EREZ_VOLUNTEER, lastName: 'Bar', firstName: 'Yonatan' },
      ]
    );

    expect(ranked.map((volunteer) => volunteer.lastName)).toEqual([
      'Bar',
      'Zohar',
    ]);
  });

  it('limits the list to the replacement suggestion cap', () => {
    const extras: ReplacementVolunteerCandidate[] = Array.from(
      { length: REPLACEMENT_SUGGESTION_LIMIT + 2 },
      (_, index) => ({
        id: `dddddddd-dddd-4ddd-8ddd-ddddddddddd${index}`,
        firstName: `Volunteer ${index}`,
        lastName: 'Holon',
        homeArea: null,
      })
    );

    expect(
      rankReplacementSuggestions(
        { street: '8 Weizmann St', addressNotes: null },
        extras
      )
    ).toHaveLength(REPLACEMENT_SUGGESTION_LIMIT);
  });
});
