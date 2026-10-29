import { z } from 'zod';

export const participationStatusSchema = z.enum([
  'invited',
  'confirmed',
  'declined',
  'cancelled',
  'no_show',
  'attended',
]);

export const volunteerResponseStatusSchema = z.enum([
  'confirmed',
  'declined',
  'no_response',
]);

export const CANCEL_REASON_MAX_LENGTH = 2000;

export const ownDayParticipationSchema = z.object({
  id: z.string().uuid(),
  cityId: z.string().uuid(),
  dayId: z.string().uuid(),
  volunteerId: z.string().uuid(),
  status: z.enum(['confirmed', 'declined']),
  respondedAt: z.string().datetime().nullable(),
  cancelReason: z.string().nullable(),
});

export const respondToDistributionDaySchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('confirmed'),
    cancelReason: z.undefined().optional(),
  }),
  z.object({
    status: z.literal('declined'),
    cancelReason: z
      .string()
      .trim()
      .min(1, 'required')
      .max(CANCEL_REASON_MAX_LENGTH),
  }),
]);

export const dayParticipationCoordinatorRowSchema = z.object({
  volunteerId: z.string().uuid(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  responseStatus: volunteerResponseStatusSchema,
  cancelReason: z.string().nullable(),
  respondedAt: z.string().datetime().nullable(),
});

export const dayParticipationsResponseSchema = z.object({
  dayId: z.string().uuid(),
  cityId: z.string().uuid(),
  responses: z.array(dayParticipationCoordinatorRowSchema),
});

export type ParticipationStatus = z.infer<typeof participationStatusSchema>;
export type VolunteerResponseStatus = z.infer<
  typeof volunteerResponseStatusSchema
>;
export type OwnDayParticipation = z.infer<typeof ownDayParticipationSchema>;
export type RespondToDistributionDay = z.infer<
  typeof respondToDistributionDaySchema
>;
export type DayParticipationCoordinatorRow = z.infer<
  typeof dayParticipationCoordinatorRowSchema
>;
export type DayParticipationsResponse = z.infer<
  typeof dayParticipationsResponseSchema
>;
