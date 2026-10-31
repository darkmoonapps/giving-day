import {
  createElderChangeRequestSchema,
  elderContactInputSchema,
  type ContactRelation,
  type CreateElderChangeRequest,
  type DeliveryElder,
  type ElderContactInput,
  type ProposedElderChanges,
} from '@giving-day/shared';

export interface ChangeRequestContactFormValue {
  name: string;
  relation: ContactRelation;
  phone: string;
  isPrimary: boolean;
}

export interface ChangeRequestFormValues {
  street: string;
  houseNumber: string;
  entrance: string;
  floor: string;
  apartment: string;
  addressNotes: string;
  notes: string;
  reason: string;
  contacts: ChangeRequestContactFormValue[];
}

export interface ChangeRequestContactFieldErrors {
  name?: string;
  phone?: string;
}

export interface ChangeRequestFormErrors {
  street?: string;
  houseNumber?: string;
  contacts?: Partial<Record<number, ChangeRequestContactFieldErrors>>;
  empty?: string;
}

export type ParseChangeRequestFormResult =
  | { success: true; data: CreateElderChangeRequest }
  | { success: false; errors: ChangeRequestFormErrors };

export function emptyChangeRequestContact(
  isPrimary = false
): ChangeRequestContactFormValue {
  return {
    name: '',
    relation: 'child',
    phone: '',
    isPrimary,
  };
}

export function elderToChangeRequestForm(
  elder: DeliveryElder
): ChangeRequestFormValues {
  return {
    street: elder.street,
    houseNumber: elder.houseNumber,
    entrance: elder.entrance ?? '',
    floor: elder.floor ?? '',
    apartment: elder.apartment ?? '',
    addressNotes: elder.addressNotes ?? '',
    notes: elder.notes ?? '',
    reason: '',
    contacts: elder.contacts.map((contact) => ({
      name: contact.name,
      relation: contact.relation,
      phone: contact.phone,
      isPrimary: contact.isPrimary,
    })),
  };
}

function nullableInput(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function issueMessage(message: string): string {
  if (message === 'phone_e164') {
    return 'phone_e164';
  }
  if (message === 'change_requests.empty') {
    return 'no_changes';
  }
  return 'required';
}

function isFilledContact(contact: ChangeRequestContactFormValue): boolean {
  return contact.name.trim().length > 0 || contact.phone.trim().length > 0;
}

function parseFormContacts(
  contacts: ChangeRequestContactFormValue[]
):
  | { success: true; data: ElderContactInput[] }
  | { success: false; errors: ChangeRequestFormErrors } {
  const parsed: ElderContactInput[] = [];
  const errors: ChangeRequestFormErrors = {};

  contacts.forEach((contact, index) => {
    if (!isFilledContact(contact)) {
      return;
    }
    const result = elderContactInputSchema.safeParse(contact);
    if (result.success) {
      parsed.push(result.data);
      return;
    }
    const contactErrors: ChangeRequestContactFieldErrors = {};
    for (const issue of result.error.issues) {
      const [field] = issue.path;
      if (field === 'name' || field === 'phone') {
        if (contactErrors[field] === undefined) {
          contactErrors[field] = issueMessage(issue.message);
        }
      }
    }
    if (Object.keys(contactErrors).length > 0) {
      errors.contacts = {
        ...errors.contacts,
        [index]: contactErrors,
      };
    }
  });

  if (errors.contacts !== undefined) {
    return { success: false, errors };
  }
  return { success: true, data: parsed };
}

function serializeContacts(
  contacts: ReadonlyArray<{
    name: string;
    relation: string;
    phone: string;
    isPrimary?: boolean;
  }>
): string {
  return JSON.stringify(
    contacts
      .map((contact) => ({
        name: contact.name.trim(),
        relation: contact.relation,
        phone: contact.phone.trim(),
        isPrimary: contact.isPrimary ?? false,
      }))
      .sort((left, right) => {
        const byName = left.name.localeCompare(right.name);
        return byName !== 0 ? byName : left.phone.localeCompare(right.phone);
      })
  );
}

function collectSchemaErrors(
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>
): ChangeRequestFormErrors {
  const errors: ChangeRequestFormErrors = {};

  for (const issue of issues) {
    const [first, second, third] = issue.path;
    if (issue.message === 'change_requests.empty') {
      errors.empty = 'no_changes';
      continue;
    }
    if (
      first === 'changes' &&
      second === 'contacts' &&
      typeof third === 'number'
    ) {
      continue;
    }
    if (
      first === 'changes' &&
      (second === 'street' || second === 'houseNumber')
    ) {
      if (errors[second] === undefined) {
        errors[second] = issueMessage(issue.message);
      }
    }
  }

  return errors;
}

export function parseChangeRequestForm(
  elder: DeliveryElder,
  values: ChangeRequestFormValues
): ParseChangeRequestFormResult {
  const parsedContacts = parseFormContacts(values.contacts);
  if (!parsedContacts.success) {
    return parsedContacts;
  }

  const changes: ProposedElderChanges = {};
  const street = values.street.trim();
  const houseNumber = values.houseNumber.trim();
  const entrance = nullableInput(values.entrance);
  const floor = nullableInput(values.floor);
  const apartment = nullableInput(values.apartment);
  const addressNotes = nullableInput(values.addressNotes);
  const notes = nullableInput(values.notes);

  if (street !== elder.street) {
    changes.street = street;
  }
  if (houseNumber !== elder.houseNumber) {
    changes.houseNumber = houseNumber;
  }
  if (entrance !== elder.entrance) {
    changes.entrance = entrance;
  }
  if (floor !== elder.floor) {
    changes.floor = floor;
  }
  if (apartment !== elder.apartment) {
    changes.apartment = apartment;
  }
  if (addressNotes !== elder.addressNotes) {
    changes.addressNotes = addressNotes;
  }
  if (notes !== elder.notes) {
    changes.notes = notes;
  }
  if (
    serializeContacts(elder.contacts) !== serializeContacts(parsedContacts.data)
  ) {
    changes.contacts = parsedContacts.data;
  }

  const parsed = createElderChangeRequestSchema.safeParse({
    elderId: elder.id,
    changes,
    reason: values.reason,
  });
  if (parsed.success) {
    return { success: true, data: parsed.data };
  }

  const errors = collectSchemaErrors(parsed.error.issues);
  if (Object.keys(errors).length === 0) {
    errors.empty = 'no_changes';
  }
  return { success: false, errors };
}

export function withPrimaryChangeRequestContact(
  contacts: ChangeRequestContactFormValue[],
  primaryIndex: number,
  isPrimary: boolean
): ChangeRequestContactFormValue[] {
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
