import { createCitySchema, type CreateCity } from '@giving-day/shared';

export interface CreateCityFormValues {
  nameHe: string;
  nameEn: string;
  slug: string;
}

export interface CreateCityFormFieldErrors {
  nameHe?: string;
  nameEn?: string;
  slug?: string;
}

export type ParseCreateCityFormResult =
  | { success: true; data: CreateCity }
  | { success: false; errors: CreateCityFormFieldErrors };

const FORM_ERROR_KEYS = ['required', 'invalid_slug', 'slug_too_long'] as const;

export type CreateCityValidationKey = (typeof FORM_ERROR_KEYS)[number];

export function isCreateCityValidationKey(
  value: string
): value is CreateCityValidationKey {
  return (FORM_ERROR_KEYS as readonly string[]).includes(value);
}

export function emptyCreateCityFormValues(): CreateCityFormValues {
  return {
    nameHe: '',
    nameEn: '',
    slug: '',
  };
}

export function parseCreateCityForm(
  values: CreateCityFormValues
): ParseCreateCityFormResult {
  const parsed = createCitySchema.safeParse({
    nameHe: values.nameHe,
    nameEn: values.nameEn,
    slug: values.slug,
  });

  if (parsed.success) {
    return { success: true, data: parsed.data };
  }

  const errors: CreateCityFormFieldErrors = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0];
    if (key !== 'nameHe' && key !== 'nameEn' && key !== 'slug') {
      continue;
    }
    if (errors[key] !== undefined) {
      continue;
    }
    errors[key] = isCreateCityValidationKey(issue.message)
      ? issue.message
      : 'required';
  }

  return { success: false, errors };
}
