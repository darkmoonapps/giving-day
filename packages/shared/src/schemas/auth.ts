import { z } from 'zod';
import { localeSchema } from './city';

export const e164PhoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, 'phone_e164');

/**
 * Converts common Israeli local numbers (050-1234567) and 00/972 prefixes
 * to E.164. Already-international values are returned unchanged.
 */
export function normalizePhoneToE164(value: string): string {
  const stripped = value.trim().replace(/[\s\-().]/g, '');

  if (stripped.length === 0) {
    return stripped;
  }

  if (stripped.startsWith('+')) {
    return stripped;
  }

  if (stripped.startsWith('00')) {
    return `+${stripped.slice(2)}`;
  }

  if (stripped.startsWith('972')) {
    return `+${stripped}`;
  }

  if (/^0\d{8,9}$/.test(stripped)) {
    return `+972${stripped.slice(1)}`;
  }

  return stripped;
}

export const phoneInputSchema = z
  .string()
  .trim()
  .min(1, 'required')
  .transform(normalizePhoneToE164)
  .pipe(e164PhoneSchema);

export const onboardingFormSchema = z.object({
  firstName: z.string().trim().min(1, 'required'),
  lastName: z.string().trim().min(1, 'required'),
  phone: phoneInputSchema,
  birthDate: z
    .union([z.literal(''), z.string().date('invalid_date')])
    .optional(),
  locale: localeSchema,
});

export type OnboardingFormValues = z.infer<typeof onboardingFormSchema>;

export const onboardingRequestSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  phone: e164PhoneSchema,
  birthDate: z.string().date().optional(),
  locale: localeSchema.optional(),
});

export type OnboardingRequest = z.infer<typeof onboardingRequestSchema>;

export const authUserSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  birthDate: z.string().nullable().optional(),
  locale: localeSchema.catch('he'),
  themePref: z.enum(['system', 'light', 'dark']).optional(),
  isSuperAdmin: z.boolean().optional(),
  onboardedAt: z.string().nullable().optional(),
});

export type AuthUser = z.infer<typeof authUserSchema>;

export const meResponseSchema = z.object({
  user: authUserSchema,
});

export type MeResponse = z.infer<typeof meResponseSchema>;

export const refreshTokenResponseSchema = z.object({
  accessToken: z.string().min(1),
});

export type RefreshTokenResponse = z.infer<typeof refreshTokenResponseSchema>;

export function isUserOnboarded(user: AuthUser): boolean {
  return typeof user.onboardedAt === 'string' && user.onboardedAt.length > 0;
}

export function getUserDisplayName(user: AuthUser): string {
  return [user.firstName, user.lastName]
    .filter(
      (part): part is string => typeof part === 'string' && part.length > 0
    )
    .join(' ');
}

export function toOnboardingRequest(
  values: OnboardingFormValues
): OnboardingRequest {
  const request: OnboardingRequest = {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    phone: e164PhoneSchema.parse(normalizePhoneToE164(values.phone)),
    locale: values.locale,
  };

  if (values.birthDate !== undefined && values.birthDate.length > 0) {
    request.birthDate = values.birthDate;
  }

  return onboardingRequestSchema.parse(request);
}

export function birthDateInputValue(value: string | null | undefined): string {
  if (value === null || value === undefined || value.length === 0) {
    return '';
  }

  return value.slice(0, 10);
}
