import { describe, expect, it } from 'vitest';
import type { CityMembershipRecordDto } from '../api/generated/api';
import {
  formatMembershipRequestDate,
  membershipDisplayName,
  removePendingMembership,
} from './pending-membership';

const TAMAR: CityMembershipRecordDto = {
  membershipId: '99999999-9999-4999-8999-999999999999',
  userId: '12121212-1212-4121-8121-121212121212',
  firstName: 'Tamar',
  lastName: 'Shalev',
  email: 'tamar.shalev@example.com',
  phone: '+972506666666',
  role: 'volunteer',
  status: 'pending',
  createdAt: '2026-10-28T09:00:00.000Z',
  approvedAt: null,
};

const DANA: CityMembershipRecordDto = {
  ...TAMAR,
  membershipId: '88888888-8888-4888-8888-888888888888',
  userId: '13131313-1313-4131-8131-131313131313',
  firstName: 'Dana',
  lastName: 'Cohen',
  email: 'dana.cohen@example.com',
  phone: '+972507777777',
};

describe('membershipDisplayName', () => {
  it('joins first and last name', () => {
    expect(membershipDisplayName('Tamar', 'Shalev', 'Applicant')).toBe(
      'Tamar Shalev'
    );
  });

  it('falls back when both names are missing', () => {
    expect(membershipDisplayName(null, null, 'Applicant')).toBe('Applicant');
    expect(membershipDisplayName('', '  ', 'Applicant')).toBe('Applicant');
  });
});

describe('formatMembershipRequestDate', () => {
  it('formats an ISO timestamp in English', () => {
    const formatted = formatMembershipRequestDate(
      '2026-10-28T09:00:00.000Z',
      'en'
    );
    expect(formatted).toContain('2026');
    expect(formatted).toContain('28');
  });

  it('returns the original value when the timestamp is invalid', () => {
    expect(formatMembershipRequestDate('not-a-date', 'he')).toBe('not-a-date');
  });
});

describe('removePendingMembership', () => {
  it('drops the matching request and leaves the rest', () => {
    expect(
      removePendingMembership(
        { memberships: [TAMAR, DANA] },
        TAMAR.membershipId
      )
    ).toEqual({ memberships: [DANA] });
  });

  it('returns undefined when there is no cached list', () => {
    expect(
      removePendingMembership(undefined, TAMAR.membershipId)
    ).toBeUndefined();
  });
});
