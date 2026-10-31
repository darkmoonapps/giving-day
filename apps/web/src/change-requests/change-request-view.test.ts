import { describe, expect, it } from 'vitest';
import {
  pendingRivkahChangeRequest,
  pendingYosefChangeRequest,
} from '../test/change-request-fixtures';
import {
  displayNullableValue,
  pendingElderIds,
  personDisplayName,
  removeChangeRequest,
} from './change-request-view';

describe('change-request-view', () => {
  it('collects pending elder ids only', () => {
    const ids = pendingElderIds([
      { elderId: '12121212-1212-4121-8121-121212121212', status: 'pending' },
      { elderId: '13131313-1313-4131-8131-131313131313', status: 'approved' },
      { elderId: '19191919-1919-4191-8191-191919191919', status: 'pending' },
    ]);

    expect([...ids]).toEqual([
      '12121212-1212-4121-8121-121212121212',
      '19191919-1919-4191-8191-191919191919',
    ]);
  });

  it('removes a request from the coordinator list cache', () => {
    const next = removeChangeRequest(
      {
        changeRequests: [
          pendingRivkahChangeRequest(),
          pendingYosefChangeRequest(),
        ],
      },
      pendingRivkahChangeRequest().id
    );

    expect(next?.changeRequests).toHaveLength(1);
    expect(next?.changeRequests[0]?.id).toBe(pendingYosefChangeRequest().id);
  });

  it('formats a volunteer name and empty field values', () => {
    expect(personDisplayName('Yonatan', 'Bar', 'Volunteer')).toBe(
      'Yonatan Bar'
    );
    expect(personDisplayName(null, null, 'Volunteer')).toBe('Volunteer');
    expect(displayNullableValue(null, '—')).toBe('—');
    expect(displayNullableValue('  ', '—')).toBe('—');
    expect(displayNullableValue('12 Example St', '—')).toBe('12 Example St');
  });
});
