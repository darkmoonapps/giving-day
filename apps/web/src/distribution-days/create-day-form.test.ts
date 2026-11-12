import { describe, expect, it } from 'vitest';
import {
  emptyCreateDayFormValues,
  isCreateDayValidationKey,
  parseAddOnsInput,
  parseCreateDayForm,
} from './create-day-form';

describe('create-day-form', () => {
  it('parses a Holon day with hours, notes, and add-ons', () => {
    expect(
      parseCreateDayForm({
        date: '2026-11-15',
        startTime: '09:00',
        endTime: '14:00',
        notesForVolunteers: ' Bring a folding cart ',
        internalNotes: ' Need extra rice bags ',
        addOns: 'holiday honey, extra oil',
      })
    ).toEqual({
      success: true,
      data: {
        date: '2026-11-15',
        startTime: '09:00',
        endTime: '14:00',
        notesForVolunteers: 'Bring a folding cart',
        internalNotes: 'Need extra rice bags',
        addOns: ['holiday honey', 'extra oil'],
      },
    });
  });

  it('requires a date and a time window', () => {
    expect(parseCreateDayForm(emptyCreateDayFormValues())).toEqual({
      success: false,
      errors: {
        date: 'required',
      },
    });
    expect(
      parseCreateDayForm({
        ...emptyCreateDayFormValues(),
        date: '2026-11-15',
        startTime: '',
        endTime: '',
      })
    ).toEqual({
      success: false,
      errors: {
        startTime: 'required',
        endTime: 'required',
      },
    });
  });

  it('rejects an inverted time window and an invalid calendar date', () => {
    expect(
      parseCreateDayForm({
        ...emptyCreateDayFormValues(),
        date: '2026-13-40',
        startTime: '14:00',
        endTime: '09:00',
      })
    ).toEqual({
      success: false,
      errors: {
        date: 'invalid_date',
        endTime: 'invalid_time_range',
      },
    });
  });

  it('defaults hours from city settings and splits add-ons', () => {
    expect(
      emptyCreateDayFormValues({
        startTime: '09:00:00',
        endTime: '14:00:00',
      })
    ).toMatchObject({
      date: '',
      startTime: '09:00',
      endTime: '14:00',
    });
    expect(parseAddOnsInput('holiday honey\nextra oil')).toEqual([
      'holiday honey',
      'extra oil',
    ]);
  });

  it('recognizes create-day validation keys', () => {
    expect(isCreateDayValidationKey('required')).toBe(true);
    expect(isCreateDayValidationKey('invalid_time_range')).toBe(true);
    expect(isCreateDayValidationKey('invalid_slug')).toBe(false);
  });
});
