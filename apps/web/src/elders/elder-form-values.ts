import {
  createElderSchema,
  updateElderSchema,
  type ContactRelation,
  type CreateElder,
  type ElderStatus,
  type UpdateElder,
} from '@giving-day/shared';
import type { ElderResponseDto } from '../api/generated/api';

export const EDITABLE_ELDER_STATUSES = [
  'active',
  'paused',
  'hospitalized',
  'moved',
  'deceased',
] as const;

export type EditableElderStatus = (typeof EDITABLE_ELDER_STATUSES)[number];

export const CONTACT_RELATIONS: ContactRelation[] = [
  'child',
  'spouse',
  'sibling',
  'caregiver',
  'social_worker',
  'neighbor',
  'other',
];

export interface ElderContactFormValue {
  name: string;
  relation: ContactRelation;
  phone: string;
  isPrimary: boolean;
}

export interface ElderFormValues {
  fullName: string;
  phone: string;
  phoneAlt: string;
  language: string;
  street: string;
  houseNumber: string;
  entrance: string;
  floor: string;
  apartment: string;
  buildingCode: string;
  addressNotes: string;
  notes: string;
  status: EditableElderStatus;
  statusReason: string;
  contacts: ElderContactFormValue[];
}

export interface ElderContactFieldErrors {
  name?: string;
  phone?: string;
}

export interface ElderFormFieldErrors {
  fullName?: string;
  phone?: string;
  phoneAlt?: string;
  street?: string;
  houseNumber?: string;
  notes?: string;
  contacts?: Partial<Record<number, ElderContactFieldErrors>>;
}

export type ParseElderFormResult =
  | { success: true; data: CreateElder }
  | { success: false; errors: ElderFormFieldErrors };

export type ParseUpdateElderFormResult =
  | { success: true; data: UpdateElder }
  | { success: false; errors: ElderFormFieldErrors };

export function emptyContactFormValue(
  isPrimary = false
): ElderContactFormValue {
  return {
    name: '',
    relation: 'child',
    phone: '',
    isPrimary,
  };
}

export function emptyElderFormValues(): ElderFormValues {
  return {
    fullName: '',
    phone: '',
    phoneAlt: '',
    language: 'he',
    street: '',
    houseNumber: '',
    entrance: '',
    floor: '',
    apartment: '',
    buildingCode: '',
    addressNotes: '',
    notes: '',
    status: 'active',
    statusReason: '',
    contacts: [emptyContactFormValue(true)],
  };
}

function nullableToInput(value: string | null | undefined): string {
  return value ?? '';
}

function isEditableStatus(status: ElderStatus): status is EditableElderStatus {
  return status !== 'removed';
}

export function elderToFormValues(elder: ElderResponseDto): ElderFormValues {
  return {
    fullName: elder.fullName,
    phone: nullableToInput(elder.phone),
    phoneAlt: nullableToInput(elder.phoneAlt),
    language: elder.language,
    street: elder.street,
    houseNumber: elder.houseNumber,
    entrance: nullableToInput(elder.entrance),
    floor: nullableToInput(elder.floor),
    apartment: nullableToInput(elder.apartment),
    buildingCode: nullableToInput(elder.buildingCode),
    addressNotes: nullableToInput(elder.addressNotes),
    notes: nullableToInput(elder.notes),
    status: isEditableStatus(elder.status) ? elder.status : 'active',
    statusReason: nullableToInput(elder.statusReason),
    contacts:
      elder.contacts.length === 0
        ? [emptyContactFormValue(true)]
        : elder.contacts.map((contact) => ({
            name: contact.name,
            relation: contact.relation,
            phone: contact.phone,
            isPrimary: contact.isPrimary,
          })),
  };
}

function filledContacts(
  contacts: ElderContactFormValue[]
): ElderContactFormValue[] {
  return contacts.filter(
    (contact) =>
      contact.name.trim().length > 0 || contact.phone.trim().length > 0
  );
}

function formToInput(
  values: ElderFormValues,
  includeEmptyContacts: boolean
): Record<string, unknown> {
  const contacts = filledContacts(values.contacts);
  return {
    fullName: values.fullName,
    phone: values.phone,
    phoneAlt: values.phoneAlt,
    language: values.language,
    street: values.street,
    houseNumber: values.houseNumber,
    entrance: values.entrance,
    floor: values.floor,
    apartment: values.apartment,
    buildingCode: values.buildingCode,
    addressNotes: values.addressNotes,
    notes: values.notes,
    status: values.status,
    statusReason: values.statusReason,
    contacts:
      includeEmptyContacts || contacts.length > 0 ? contacts : undefined,
  };
}

function issueMessage(message: string): string {
  return message === 'phone_e164' ? 'phone_e164' : 'required';
}

function collectErrors(
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>
): ElderFormFieldErrors {
  const errors: ElderFormFieldErrors = {};

  for (const issue of issues) {
    const [first, second, third] = issue.path;
    if (first === 'contacts' && typeof second === 'number') {
      const contactErrors = errors.contacts ?? {};
      const current = contactErrors[second] ?? {};
      if (third === 'name' || third === 'phone') {
        current[third] = issueMessage(issue.message);
      }
      contactErrors[second] = current;
      errors.contacts = contactErrors;
      continue;
    }

    if (
      first === 'fullName' ||
      first === 'phone' ||
      first === 'phoneAlt' ||
      first === 'street' ||
      first === 'houseNumber' ||
      first === 'notes'
    ) {
      if (errors[first] === undefined) {
        errors[first] = issueMessage(issue.message);
      }
    }
  }

  return errors;
}

export function parseCreateElderForm(
  values: ElderFormValues
): ParseElderFormResult {
  const parsed = createElderSchema.safeParse(formToInput(values, false));
  if (parsed.success) {
    return { success: true, data: parsed.data };
  }
  return { success: false, errors: collectErrors(parsed.error.issues) };
}

export function parseUpdateElderForm(
  values: ElderFormValues
): ParseUpdateElderFormResult {
  const parsed = updateElderSchema.safeParse(formToInput(values, true));
  if (parsed.success) {
    return { success: true, data: parsed.data };
  }
  return { success: false, errors: collectErrors(parsed.error.issues) };
}

export function withPrimaryContact(
  contacts: ElderContactFormValue[],
  primaryIndex: number,
  isPrimary: boolean
): ElderContactFormValue[] {
  return contacts.map((contact, index) => {
    if (index === primaryIndex) {
      return { ...contact, isPrimary };
    }
    if (isPrimary && contact.isPrimary) {
      return { ...contact, isPrimary: false };
    }
    return contact;
  });
}

export function isElderArchived(elder: { archivedAt: string | null }): boolean {
  return elder.archivedAt !== null;
}

export function canDeactivateElder(elder: {
  archivedAt: string | null;
}): boolean {
  return !isElderArchived(elder);
}

export function canReactivateElder(elder: {
  archivedAt: string | null;
  status: ElderStatus;
}): boolean {
  return !isElderArchived(elder) && elder.status !== 'active';
}

export function canEditElder(elder: { archivedAt: string | null }): boolean {
  return !isElderArchived(elder);
}

export function elderListParams(showInactive: boolean): {
  status?: 'active';
  includeArchived?: boolean;
} {
  return showInactive ? { includeArchived: true } : { status: 'active' };
}
