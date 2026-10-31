import { z } from 'zod';

export const cityRoleSchema = z.enum(['coordinator', 'volunteer']);

export const membershipStatusSchema = z.enum([
  'pending',
  'active',
  'paused',
  'removed',
]);

export const localeSchema = z.enum(['he', 'en']);

export const timeOfDaySchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/, 'validation.invalid_time');

export const citySettingsExtraSchema = z.record(z.string(), z.unknown());

export function isAbsoluteHttpsUrl(value: string): boolean {
  return /^https:\/\/[^/\s]+(\/.*)?$/i.test(value);
}

export const httpsUrlSchema = z
  .string()
  .refine(isAbsoluteHttpsUrl, 'validation.https_url_required');

export const citySettingsSchema = z.object({
  cityId: z.string().uuid(),
  centerAddress: z.string().min(1),
  centerLat: z.number(),
  centerLng: z.number(),
  defaultStartTime: timeOfDaySchema,
  defaultEndTime: timeOfDaySchema,
  confirmReminderAfterHours: z.number().int().min(0),
  unpickedPushMinutesBeforeEnd: z.number().int().min(0),
  missingFinalStatusWaitHours: z.number().int().min(0),
  defaultLocale: localeSchema,
  defaultTheme: z.string().min(1),
  orgName: z.string().nullable(),
  logoUrl: httpsUrlSchema.nullable(),
  extra: citySettingsExtraSchema,
});

export const updateCitySettingsSchema = citySettingsSchema
  .omit({ cityId: true })
  .partial();

export const cityJoinLinkStatusSchema = z.object({
  role: cityRoleSchema,
  active: z.boolean(),
  createdAt: z.string().datetime().nullable(),
  usedCount: z.number().int().min(0),
});

export const cityJoinLinksResponseSchema = z.object({
  links: z.array(cityJoinLinkStatusSchema),
});

export const cityJoinLinkCreatedSchema = z.object({
  role: cityRoleSchema,
  token: z.string().min(1),
  url: z.string().url(),
  createdAt: z.string().datetime(),
  usedCount: z.number().int().min(0),
});

export const cityCoordinatorSchema = z.object({
  membershipId: z.string().uuid(),
  userId: z.string().uuid(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  status: membershipStatusSchema,
  createdAt: z.string().datetime(),
  approvedAt: z.string().datetime().nullable(),
});

export const cityCoordinatorsResponseSchema = z.object({
  coordinators: z.array(cityCoordinatorSchema),
});

export const addCityCoordinatorSchema = z
  .object({
    userId: z.string().uuid().optional(),
    email: z.string().email().optional(),
  })
  .refine((value) => Boolean(value.userId || value.email), {
    message: 'cities.user_id_or_email_required',
  });

export const redeemJoinLinkRequestSchema = z.object({
  token: z.string().trim().min(1).max(128),
});

export const redeemJoinLinkResultSchema = z.enum(['pending', 'already_active']);

export const redeemedCityMembershipSchema = z.object({
  membershipId: z.string().uuid(),
  cityId: z.string().uuid(),
  citySlug: z.string().min(1),
  cityNameHe: z.string().min(1),
  cityNameEn: z.string().min(1),
  role: cityRoleSchema,
  status: membershipStatusSchema,
});

export const redeemJoinLinkResponseSchema = z.object({
  result: redeemJoinLinkResultSchema,
  membership: redeemedCityMembershipSchema,
});

export const cityMembershipRecordSchema = z.object({
  membershipId: z.string().uuid(),
  userId: z.string().uuid(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  role: cityRoleSchema,
  status: membershipStatusSchema,
  createdAt: z.string().datetime(),
  approvedAt: z.string().datetime().nullable(),
});

export const cityPendingMembershipsResponseSchema = z.object({
  memberships: z.array(cityMembershipRecordSchema),
});

export type CityRole = z.infer<typeof cityRoleSchema>;
export type MembershipStatus = z.infer<typeof membershipStatusSchema>;
export type Locale = z.infer<typeof localeSchema>;
export type CitySettings = z.infer<typeof citySettingsSchema>;
export type UpdateCitySettings = z.infer<typeof updateCitySettingsSchema>;
export type CityJoinLinkStatus = z.infer<typeof cityJoinLinkStatusSchema>;
export type CityJoinLinksResponse = z.infer<typeof cityJoinLinksResponseSchema>;
export type CityJoinLinkCreated = z.infer<typeof cityJoinLinkCreatedSchema>;
export type CityCoordinator = z.infer<typeof cityCoordinatorSchema>;
export type CityCoordinatorsResponse = z.infer<
  typeof cityCoordinatorsResponseSchema
>;
export type AddCityCoordinator = z.infer<typeof addCityCoordinatorSchema>;
export type RedeemJoinLinkRequest = z.infer<typeof redeemJoinLinkRequestSchema>;
export type RedeemJoinLinkResult = z.infer<typeof redeemJoinLinkResultSchema>;
export type RedeemedCityMembership = z.infer<
  typeof redeemedCityMembershipSchema
>;
export type RedeemJoinLinkResponse = z.infer<
  typeof redeemJoinLinkResponseSchema
>;
export type CityMembershipRecord = z.infer<typeof cityMembershipRecordSchema>;
export type CityPendingMembershipsResponse = z.infer<
  typeof cityPendingMembershipsResponseSchema
>;
export type HttpsUrl = z.infer<typeof httpsUrlSchema>;
