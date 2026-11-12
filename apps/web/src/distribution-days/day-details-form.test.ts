import { describe, expect, it } from 'vitest';
import { openDay } from '../test/distribution-day-fixtures';
import {
  dayToFormValues,
  isEditableDayStatus,
  parseDayDetailsForm,
} from './day-details-form';

describe('isEditableDayStatus', () => {
  it('allows draft, published, and in-progress days', () => {
    expect(isEditableDayStatus('draft')).toBe(true);
    expect(isEditableDayStatus('published')).toBe(true);
    expect(isEditableDayStatus('in_progress')).toBe(true);
    expect(isEditableDayStatus('closed')).toBe(false);
    expect(isEditableDayStatus('cancelled')).toBe(false);
  });
});

describe('dayToFormValues', () => {
  it('maps Holon day hours and notes into form strings', () => {
    expect(dayToFormValues(openDay)).toEqual({
      startTime: '09:00',
      endTime: '14:00',
      notesForVolunteers: 'Bring a folding cart',
    });
  });
});

describe('parseDayDetailsForm', () => {
  it('accepts Holon hours and a volunteer note', () => {
    const result = parseDayDetailsForm({
      startTime: '08:00',
      endTime: '13:00',
      notesForVolunteers: 'Pick up an additional blanket/package',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        startTime: '08:00',
        endTime: '13:00',
        notesForVolunteers: 'Pick up an additional blanket/package',
      });
    }
  });

  it('clears a blank volunteer note', () => {
    const result = parseDayDetailsForm({
      startTime: '09:00',
      endTime: '14:00',
      notesForVolunteers: '   ',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notesForVolunteers).toBeNull();
    }
  });

  it('rejects a reversed time range', () => {
    const result = parseDayDetailsForm({
      startTime: '14:00',
      endTime: '09:00',
      notesForVolunteers: '',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.endTime).toBe('invalid_time_range');
    }
  });

  it('rejects an empty start time', () => {
    const result = parseDayDetailsForm({
      startTime: '',
      endTime: '14:00',
      notesForVolunteers: '',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.startTime).toBe('invalid_time');
    }
  });
});
