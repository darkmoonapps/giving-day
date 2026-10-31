import { describe, expect, it } from 'vitest';
import { elderRivkah, elderYosefPaused } from '../test/elder-fixtures';
import {
  canDeactivateElder,
  canEditElder,
  canReactivateElder,
  elderListParams,
  elderToFormValues,
  emptyElderFormValues,
  parseCreateElderForm,
  parseUpdateElderForm,
  withPrimaryContact,
} from './elder-form-values';

describe('elderListParams', () => {
  it('lists active elders by default and archived when toggled', () => {
    expect(elderListParams(false)).toEqual({ status: 'active' });
    expect(elderListParams(true)).toEqual({ includeArchived: true });
  });
});

describe('elder status helpers', () => {
  it('allows edit and deactivate only for non-archived elders', () => {
    expect(canEditElder(elderRivkah)).toBe(true);
    expect(canDeactivateElder(elderRivkah)).toBe(true);
    expect(canReactivateElder(elderRivkah)).toBe(false);
    expect(canReactivateElder(elderYosefPaused)).toBe(true);
    expect(
      canEditElder({
        archivedAt: '2026-10-15T09:00:00.000Z',
      })
    ).toBe(false);
    expect(
      canDeactivateElder({
        archivedAt: '2026-10-15T09:00:00.000Z',
      })
    ).toBe(false);
    expect(
      canReactivateElder({
        archivedAt: '2026-10-15T09:00:00.000Z',
        status: 'removed',
      })
    ).toBe(false);
  });
});

describe('parseCreateElderForm', () => {
  it('normalizes a Holon phone and next of kin', () => {
    const values = emptyElderFormValues();
    values.fullName = 'Miriam Cohen';
    values.street = '8 Weizmann St';
    values.houseNumber = '8';
    values.phone = '050-0000012';
    values.notes = 'Knock on the metal door';
    values.contacts = [
      {
        name: 'Dana Cohen',
        relation: 'child',
        phone: '050-7777777',
        isPrimary: true,
      },
    ];

    const result = parseCreateElderForm(values);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({
        fullName: 'Miriam Cohen',
        street: '8 Weizmann St',
        houseNumber: '8',
        phone: '+972500000012',
        language: 'he',
        status: 'active',
        notes: 'Knock on the metal door',
        contacts: [
          {
            name: 'Dana Cohen',
            relation: 'child',
            phone: '+972507777777',
            isPrimary: true,
          },
        ],
      });
    }
  });

  it('requires a name, street, and house number', () => {
    const result = parseCreateElderForm(emptyElderFormValues());
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.fullName).toBe('required');
      expect(result.errors.street).toBe('required');
      expect(result.errors.houseNumber).toBe('required');
    }
  });

  it('rejects an invalid next-of-kin phone', () => {
    const values = emptyElderFormValues();
    values.fullName = 'Miriam Cohen';
    values.street = '8 Weizmann St';
    values.houseNumber = '8';
    values.contacts = [
      {
        name: 'Dana Cohen',
        relation: 'child',
        phone: 'not-a-phone',
        isPrimary: true,
      },
    ];

    const result = parseCreateElderForm(values);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.contacts?.[0]?.phone).toBe('phone_e164');
    }
  });
});

describe('parseUpdateElderForm', () => {
  it('maps an existing elder and keeps notes plus next of kin', () => {
    const result = parseUpdateElderForm(elderToFormValues(elderRivkah));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBe('Entrance is around the back');
      expect(result.data.contacts).toEqual([
        {
          name: 'Tamar Levi',
          relation: 'child',
          phone: '+972506666666',
          isPrimary: true,
        },
      ]);
    }
  });
});

describe('withPrimaryContact', () => {
  it('keeps at most one primary contact', () => {
    const contacts = withPrimaryContact(
      [
        {
          name: 'Tamar Levi',
          relation: 'child',
          phone: '+972506666666',
          isPrimary: true,
        },
        {
          name: 'Dana Cohen',
          relation: 'neighbor',
          phone: '+972507777777',
          isPrimary: false,
        },
      ],
      1,
      true
    );

    expect(contacts.map((contact) => contact.isPrimary)).toEqual([false, true]);
  });
});
