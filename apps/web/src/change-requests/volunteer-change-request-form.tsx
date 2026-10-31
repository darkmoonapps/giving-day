import {
  Checkbox,
  NativeSelect,
  Stack,
  Textarea,
  TextInput,
} from '@mantine/core';
import type {
  ContactRelation,
  CreateElderChangeRequest,
  DeliveryElder,
} from '@giving-day/shared';
import { AppAlert, AppButton, AppText } from '@giving-day/ui';
import type { TFunction } from 'i18next';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { CONTACT_RELATIONS } from '../elders/elder-form-values';
import {
  elderToChangeRequestForm,
  emptyChangeRequestContact,
  parseChangeRequestForm,
  withPrimaryChangeRequestContact,
  type ChangeRequestFormErrors,
  type ChangeRequestFormValues,
} from './change-request-form';

const VALIDATION_KEYS = ['required', 'phone_e164', 'no_changes'] as const;

type ValidationKey = (typeof VALIDATION_KEYS)[number];

const RELATION_LABEL_KEYS: Record<
  ContactRelation,
  | 'contact_relation_child'
  | 'contact_relation_spouse'
  | 'contact_relation_sibling'
  | 'contact_relation_caregiver'
  | 'contact_relation_social_worker'
  | 'contact_relation_neighbor'
  | 'contact_relation_other'
> = {
  child: 'contact_relation_child',
  spouse: 'contact_relation_spouse',
  sibling: 'contact_relation_sibling',
  caregiver: 'contact_relation_caregiver',
  social_worker: 'contact_relation_social_worker',
  neighbor: 'contact_relation_neighbor',
  other: 'contact_relation_other',
};

function isValidationKey(value: string): value is ValidationKey {
  return (VALIDATION_KEYS as readonly string[]).includes(value);
}

function validationMessage(t: TFunction<'validation'>, key: string): string {
  return t(isValidationKey(key) ? key : 'required');
}

function inputValue(
  event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
): string {
  return event.currentTarget.value;
}

export function VolunteerChangeRequestForm({
  elder,
  submitting,
  error,
  onSubmit,
  onCancel,
}: {
  elder: DeliveryElder;
  submitting: boolean;
  error: boolean;
  onSubmit: (data: CreateElderChangeRequest) => void;
  onCancel: () => void;
}): JSX.Element {
  const { t } = useTranslation('volunteer');
  const { t: tValidation } = useTranslation('validation');
  const [values, setValues] = useState<ChangeRequestFormValues>(() =>
    elderToChangeRequestForm(elder)
  );
  const [errors, setErrors] = useState<ChangeRequestFormErrors>({});

  useEffect(() => {
    setValues(elderToChangeRequestForm(elder));
    setErrors({});
  }, [elder]);

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const parsed = parseChangeRequestForm(elder, values);
    if (!parsed.success) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    onSubmit(parsed.data);
  };

  return (
    <form onSubmit={submit} data-testid="change-request-form">
      <Stack gap="sm">
        {error ? (
          <AppAlert color="red" data-testid="change-request-submit-error">
            {t('change_request_submit_error')}
          </AppAlert>
        ) : null}
        {errors.empty !== undefined ? (
          <AppAlert color="yellow" data-testid="change-request-empty">
            {validationMessage(tValidation, errors.empty)}
          </AppAlert>
        ) : null}

        <TextInput
          label={t('street_label')}
          value={values.street}
          error={
            errors.street === undefined
              ? undefined
              : validationMessage(tValidation, errors.street)
          }
          data-testid="change-request-street"
          onChange={(event) => {
            const street = inputValue(event);
            setValues((current) => ({ ...current, street }));
          }}
        />
        <TextInput
          label={t('house_number_label')}
          value={values.houseNumber}
          error={
            errors.houseNumber === undefined
              ? undefined
              : validationMessage(tValidation, errors.houseNumber)
          }
          data-testid="change-request-house-number"
          onChange={(event) => {
            const houseNumber = inputValue(event);
            setValues((current) => ({ ...current, houseNumber }));
          }}
        />
        <TextInput
          label={t('entrance_label')}
          value={values.entrance}
          data-testid="change-request-entrance"
          onChange={(event) => {
            const entrance = inputValue(event);
            setValues((current) => ({ ...current, entrance }));
          }}
        />
        <TextInput
          label={t('floor_label')}
          value={values.floor}
          data-testid="change-request-floor"
          onChange={(event) => {
            const floor = inputValue(event);
            setValues((current) => ({ ...current, floor }));
          }}
        />
        <TextInput
          label={t('apartment_label')}
          value={values.apartment}
          data-testid="change-request-apartment"
          onChange={(event) => {
            const apartment = inputValue(event);
            setValues((current) => ({ ...current, apartment }));
          }}
        />
        <Textarea
          label={t('address_notes_label')}
          value={values.addressNotes}
          minRows={2}
          data-testid="change-request-address-notes"
          onChange={(event) => {
            const addressNotes = inputValue(event);
            setValues((current) => ({ ...current, addressNotes }));
          }}
        />
        <Textarea
          label={t('elder_notes_label')}
          value={values.notes}
          minRows={2}
          data-testid="change-request-notes"
          onChange={(event) => {
            const notes = inputValue(event);
            setValues((current) => ({ ...current, notes }));
          }}
        />

        <Stack gap="sm" data-testid="change-request-next-of-kin">
          <AppText fw={500}>{t('next_of_kin_label')}</AppText>
          {values.contacts.map((contact, index) => {
            const contactErrors = errors.contacts?.[index];
            return (
              <Stack
                key={`change-request-contact-${index}`}
                gap="xs"
                data-testid={`change-request-contact-${index}`}
              >
                <TextInput
                  label={t('next_of_kin_name')}
                  value={contact.name}
                  error={
                    contactErrors?.name === undefined
                      ? undefined
                      : validationMessage(tValidation, contactErrors.name)
                  }
                  data-testid={`change-request-contact-name-${index}`}
                  onChange={(event) => {
                    const name = inputValue(event);
                    setValues((current) => ({
                      ...current,
                      contacts: current.contacts.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, name } : item
                      ),
                    }));
                  }}
                />
                <NativeSelect
                  label={t('next_of_kin_relation')}
                  value={contact.relation}
                  data={CONTACT_RELATIONS.map((relation) => ({
                    value: relation,
                    label: t(RELATION_LABEL_KEYS[relation]),
                  }))}
                  data-testid={`change-request-contact-relation-${index}`}
                  onChange={(event) => {
                    const relation = inputValue(event) as ContactRelation;
                    setValues((current) => ({
                      ...current,
                      contacts: current.contacts.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, relation } : item
                      ),
                    }));
                  }}
                />
                <TextInput
                  label={t('next_of_kin_phone')}
                  value={contact.phone}
                  inputMode="tel"
                  error={
                    contactErrors?.phone === undefined
                      ? undefined
                      : validationMessage(tValidation, contactErrors.phone)
                  }
                  data-testid={`change-request-contact-phone-${index}`}
                  onChange={(event) => {
                    const phone = inputValue(event);
                    setValues((current) => ({
                      ...current,
                      contacts: current.contacts.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, phone } : item
                      ),
                    }));
                  }}
                />
                <Checkbox
                  label={t('next_of_kin_primary')}
                  checked={contact.isPrimary}
                  onChange={(event) => {
                    const isPrimary = event.currentTarget.checked;
                    setValues((current) => ({
                      ...current,
                      contacts: withPrimaryChangeRequestContact(
                        current.contacts,
                        index,
                        isPrimary
                      ),
                    }));
                  }}
                />
                <AppButton
                  size="xs"
                  variant="light"
                  type="button"
                  data-testid={`remove-change-request-contact-${index}`}
                  onClick={() => {
                    setValues((current) => ({
                      ...current,
                      contacts: current.contacts.filter(
                        (_item, itemIndex) => itemIndex !== index
                      ),
                    }));
                  }}
                >
                  {t('remove_next_of_kin')}
                </AppButton>
              </Stack>
            );
          })}
          <AppButton
            size="xs"
            variant="light"
            type="button"
            data-testid="add-change-request-contact"
            onClick={() => {
              setValues((current) => ({
                ...current,
                contacts: [
                  ...current.contacts,
                  emptyChangeRequestContact(current.contacts.length === 0),
                ],
              }));
            }}
          >
            {t('add_next_of_kin')}
          </AppButton>
        </Stack>

        <Textarea
          label={t('change_request_reason_label')}
          placeholder={t('change_request_reason_placeholder')}
          value={values.reason}
          minRows={2}
          data-testid="change-request-reason"
          onChange={(event) => {
            const reason = inputValue(event);
            setValues((current) => ({ ...current, reason }));
          }}
        />

        <AppButton
          type="submit"
          loading={submitting}
          data-testid="change-request-submit"
        >
          {t('change_request_submit')}
        </AppButton>
        <AppButton
          type="button"
          variant="light"
          onClick={onCancel}
          data-testid="change-request-cancel"
        >
          {t('change_request_cancel')}
        </AppButton>
      </Stack>
    </form>
  );
}
