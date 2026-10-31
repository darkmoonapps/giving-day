import {
  Checkbox,
  NativeSelect,
  Stack,
  Textarea,
  TextInput,
} from '@mantine/core';
import type { ContactRelation } from '@giving-day/shared';
import { AppButton, AppTitle } from '@giving-day/ui';
import type { TFunction } from 'i18next';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { CreateElder, UpdateElder } from '@giving-day/shared';
import {
  CONTACT_RELATIONS,
  EDITABLE_ELDER_STATUSES,
  emptyContactFormValue,
  emptyElderFormValues,
  parseCreateElderForm,
  parseUpdateElderForm,
  withPrimaryContact,
  type ElderFormFieldErrors,
  type ElderFormValues,
} from './elder-form-values';

const VALIDATION_KEYS = ['required', 'phone_e164'] as const;

type ValidationKey = (typeof VALIDATION_KEYS)[number];

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

const STATUS_LABEL_KEYS = {
  active: 'elder_status_active',
  paused: 'elder_status_paused',
  hospitalized: 'elder_status_hospitalized',
  moved: 'elder_status_moved',
  deceased: 'elder_status_deceased',
} as const;

const RELATION_LABEL_KEYS = {
  child: 'relation_child',
  spouse: 'relation_spouse',
  sibling: 'relation_sibling',
  caregiver: 'relation_caregiver',
  social_worker: 'relation_social_worker',
  neighbor: 'relation_neighbor',
  other: 'relation_other',
} as const;

interface ElderFormBaseProps {
  initialValues?: ElderFormValues;
  submitting: boolean;
  onCancel?: () => void;
}

export type ElderFormProps =
  | (ElderFormBaseProps & {
      mode: 'create';
      onSubmit: (data: CreateElder) => void;
    })
  | (ElderFormBaseProps & {
      mode: 'edit';
      onSubmit: (data: UpdateElder) => void;
    });

export function ElderForm({
  mode,
  initialValues,
  submitting,
  onSubmit,
  onCancel,
}: ElderFormProps): JSX.Element {
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation('common');
  const { t: tValidation } = useTranslation('validation');
  const [values, setValues] = useState<ElderFormValues>(
    initialValues ?? emptyElderFormValues()
  );
  const [errors, setErrors] = useState<ElderFormFieldErrors>({});

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (mode === 'create') {
      const parsed = parseCreateElderForm(values);
      if (!parsed.success) {
        setErrors(parsed.errors);
        return;
      }
      setErrors({});
      onSubmit(parsed.data);
      return;
    }

    const parsed = parseUpdateElderForm(values);
    if (!parsed.success) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    onSubmit(parsed.data);
  };

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      data-testid="elder-form"
      data-mode={mode}
    >
      <Stack gap="sm">
        <AppTitle order={2}>
          {mode === 'create' ? t('create_elder') : t('edit_elder')}
        </AppTitle>
        <TextInput
          id="elder-full-name"
          name="fullName"
          label={t('elder_name')}
          value={values.fullName}
          required
          withAsterisk
          error={
            errors.fullName === undefined
              ? undefined
              : validationMessage(tValidation, errors.fullName)
          }
          onChange={(event) => {
            const fullName = inputValue(event);
            setValues((current) => ({ ...current, fullName }));
          }}
        />
        <TextInput
          id="elder-phone"
          name="phone"
          label={t('elder_phone')}
          value={values.phone}
          inputMode="tel"
          autoComplete="tel"
          error={
            errors.phone === undefined
              ? undefined
              : validationMessage(tValidation, errors.phone)
          }
          onChange={(event) => {
            const phone = inputValue(event);
            setValues((current) => ({ ...current, phone }));
          }}
        />
        <TextInput
          id="elder-phone-alt"
          name="phoneAlt"
          label={t('elder_phone_alt')}
          value={values.phoneAlt}
          inputMode="tel"
          error={
            errors.phoneAlt === undefined
              ? undefined
              : validationMessage(tValidation, errors.phoneAlt)
          }
          onChange={(event) => {
            const phoneAlt = inputValue(event);
            setValues((current) => ({ ...current, phoneAlt }));
          }}
        />
        <NativeSelect
          name="language"
          label={t('elder_language')}
          value={values.language}
          data={[
            { value: 'he', label: tCommon('language.he') },
            { value: 'en', label: tCommon('language.en') },
          ]}
          onChange={(event) => {
            const language = inputValue(event);
            setValues((current) => ({ ...current, language }));
          }}
        />
        <TextInput
          id="elder-street"
          name="street"
          label={t('elder_street')}
          value={values.street}
          required
          withAsterisk
          error={
            errors.street === undefined
              ? undefined
              : validationMessage(tValidation, errors.street)
          }
          onChange={(event) => {
            const street = inputValue(event);
            setValues((current) => ({ ...current, street }));
          }}
        />
        <TextInput
          id="elder-house-number"
          name="houseNumber"
          label={t('elder_house_number')}
          value={values.houseNumber}
          required
          withAsterisk
          error={
            errors.houseNumber === undefined
              ? undefined
              : validationMessage(tValidation, errors.houseNumber)
          }
          onChange={(event) => {
            const houseNumber = inputValue(event);
            setValues((current) => ({ ...current, houseNumber }));
          }}
        />
        <TextInput
          name="entrance"
          label={t('elder_entrance')}
          value={values.entrance}
          onChange={(event) => {
            const entrance = inputValue(event);
            setValues((current) => ({ ...current, entrance }));
          }}
        />
        <TextInput
          name="floor"
          label={t('elder_floor')}
          value={values.floor}
          onChange={(event) => {
            const floor = inputValue(event);
            setValues((current) => ({ ...current, floor }));
          }}
        />
        <TextInput
          name="apartment"
          label={t('elder_apartment')}
          value={values.apartment}
          onChange={(event) => {
            const apartment = inputValue(event);
            setValues((current) => ({ ...current, apartment }));
          }}
        />
        <TextInput
          name="buildingCode"
          label={t('elder_building_code')}
          value={values.buildingCode}
          onChange={(event) => {
            const buildingCode = inputValue(event);
            setValues((current) => ({ ...current, buildingCode }));
          }}
        />
        <Textarea
          name="addressNotes"
          label={t('elder_address_notes')}
          value={values.addressNotes}
          rows={2}
          onChange={(event) => {
            const addressNotes = inputValue(event);
            setValues((current) => ({ ...current, addressNotes }));
          }}
        />
        <Textarea
          id="elder-notes"
          name="notes"
          label={t('elder_notes')}
          description={t('elder_notes_hint')}
          value={values.notes}
          rows={3}
          error={
            errors.notes === undefined
              ? undefined
              : validationMessage(tValidation, errors.notes)
          }
          onChange={(event) => {
            const notes = inputValue(event);
            setValues((current) => ({ ...current, notes }));
          }}
        />
        <NativeSelect
          name="status"
          label={t('elder_status')}
          value={values.status}
          data={EDITABLE_ELDER_STATUSES.map((status) => ({
            value: status,
            label: t(STATUS_LABEL_KEYS[status]),
          }))}
          onChange={(event) => {
            const status = inputValue(event) as ElderFormValues['status'];
            setValues((current) => ({ ...current, status }));
          }}
        />
        <TextInput
          name="statusReason"
          label={t('elder_status_reason')}
          value={values.statusReason}
          onChange={(event) => {
            const statusReason = inputValue(event);
            setValues((current) => ({ ...current, statusReason }));
          }}
        />

        <Stack gap="sm" data-testid="next-of-kin">
          <AppTitle order={3}>{t('next_of_kin')}</AppTitle>
          {values.contacts.map((contact, index) => {
            const contactErrors = errors.contacts?.[index];
            return (
              <Stack
                key={`contact-${index}`}
                gap="xs"
                data-testid={`next-of-kin-${index}`}
              >
                <TextInput
                  id={`elder-contact-name-${index}`}
                  label={t('next_of_kin_name')}
                  value={contact.name}
                  error={
                    contactErrors?.name === undefined
                      ? undefined
                      : validationMessage(tValidation, contactErrors.name)
                  }
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
                  id={`elder-contact-phone-${index}`}
                  label={t('next_of_kin_phone')}
                  value={contact.phone}
                  inputMode="tel"
                  error={
                    contactErrors?.phone === undefined
                      ? undefined
                      : validationMessage(tValidation, contactErrors.phone)
                  }
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
                      contacts: withPrimaryContact(
                        current.contacts,
                        index,
                        isPrimary
                      ),
                    }));
                  }}
                />
                {values.contacts.length > 1 ? (
                  <AppButton
                    size="xs"
                    variant="light"
                    type="button"
                    data-testid={`remove-next-of-kin-${index}`}
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
                ) : null}
              </Stack>
            );
          })}
          <AppButton
            size="xs"
            variant="light"
            type="button"
            data-testid="add-next-of-kin"
            onClick={() => {
              setValues((current) => ({
                ...current,
                contacts: [...current.contacts, emptyContactFormValue(false)],
              }));
            }}
          >
            {t('add_next_of_kin')}
          </AppButton>
        </Stack>

        <AppButton
          type="submit"
          data-testid="elder-form-submit"
          loading={submitting}
        >
          {t('save_elder')}
        </AppButton>
        {onCancel !== undefined ? (
          <AppButton
            type="button"
            variant="light"
            data-testid="elder-form-cancel"
            disabled={submitting}
            onClick={onCancel}
          >
            {t('cancel_edit')}
          </AppButton>
        ) : null}
      </Stack>
    </form>
  );
}
