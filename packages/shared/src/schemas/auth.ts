import { z } from 'zod';
import { localeSchema } from './city';

export const e164PhoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, 'phone_e164');

export const onboardingFormSchema = z.object({
  firstName: z.string().trim().min(1, 'required'),
  lastName: z.string().trim().min(1, 'required'),
  phone: e164PhoneSchema,
  birthDate: z
    .union([z.literal(''), z.string().date('invalid_date')])
    .optional(),
  email: z.union([z.literal(''), z.string().email('invalid_email')]).optional(),
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
    phone: values.phone,
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
