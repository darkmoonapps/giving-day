import { describe, expect, it } from 'vitest';
import type { DeliveryElder } from '@giving-day/shared';
import {
  elderToChangeRequestForm,
  parseChangeRequestForm,
  withPrimaryChangeRequestContact,
} from './change-request-form';

const rivkah: DeliveryElder = {
  id: '12121212-1212-4121-8121-121212121212',
  fullName: 'Rivkah Levi',
  street: '12 Example St',
  houseNumber: '12',
  entrance: 'B',
  floor: '3',
  apartment: '7',
  addressNotes: 'Knock loudly',
  notes: 'Entrance is around the back',
  contacts: [
    {
      name: 'Tamar Levi',
      relation: 'child',
      phone: '+972506666666',
      isPrimary: true,
    },
  ],
};

describe('parseChangeRequestForm', () => {
  it('builds only the fields that changed, including a Holon address', () => {
    const values = elderToChangeRequestForm(rivkah);
    values.street = '18 Weizmann St';
    values.notes = 'Ring the Holon courtyard bell';
    values.reason = 'Moved within Holon';

    const parsed = parseChangeRequestForm(rivkah, values);

    expect(parsed).toEqual({
      success: true,
      data: {
        elderId: rivkah.id,
        changes: {
          street: '18 Weizmann St',
          notes: 'Ring the Holon courtyard bell',
        },
        reason: 'Moved within Holon',
      },
    });
  });

  it('rejects a submit with no changed details', () => {
    const parsed = parseChangeRequestForm(
      rivkah,
      elderToChangeRequestForm(rivkah)
    );

    expect(parsed).toEqual({
      success: false,
      errors: { empty: 'no_changes' },
    });
  });

  it('requires a street when the volunteer clears it', () => {
    const values = elderToChangeRequestForm(rivkah);
    values.street = '   ';

    const parsed = parseChangeRequestForm(rivkah, values);

    expect(parsed.success).toBe(false);
    if (parsed.success) {
      return;
    }
    expect(parsed.errors.street).toBe('required');
  });

  it('includes a next-of-kin replacement and normalizes the phone', () => {
    const values = elderToChangeRequestForm(rivkah);
    values.contacts = [
      {
        name: 'Dana Levi',
        relation: 'child',
        phone: '050-7777777',
        isPrimary: true,
      },
    ];

    const parsed = parseChangeRequestForm(rivkah, values);

    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }
    expect(parsed.data.changes.contacts).toEqual([
      {
        name: 'Dana Levi',
        relation: 'child',
        phone: '+972507777777',
        isPrimary: true,
      },
    ]);
  });

  it('keeps only one primary next-of-kin contact', () => {
    const contacts = withPrimaryChangeRequestContact(
      [
        {
          name: 'Tamar Levi',
          relation: 'child',
          phone: '+972506666666',
          isPrimary: true,
        },
        {
          name: 'Dana Levi',
          relation: 'sibling',
          phone: '+972507777777',
          isPrimary: false,
        },
      ],
      1,
      true
    );

    expect(contacts[0]?.isPrimary).toBe(false);
    expect(contacts[1]?.isPrimary).toBe(true);
  });
});
