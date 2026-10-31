import { z } from 'zod';
import { dateOnlySchema } from './auth';
import { deliveryVolunteerSchema } from './delivery';
import { elderStatusSchema } from './elder';

export const matchTypeSchema = z.enum(['permanent', 'one_time']);

export const matchEndReasonSchema = z.enum([
  'volunteer_left',
  'elder_inactive',
  'reassigned',
  'other',
]);

export const matchElderSummarySchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().min(1),
  status: elderStatusSchema,
});

export const matchVolunteerSummarySchema = deliveryVolunteerSchema;

export const permanentMatchSchema = z.object({
  id: z.string().uuid(),
  cityId: z.string().uuid(),
  elderId: z.string().uuid(),
  volunteerId: z.string().uuid(),
  type: z.literal('permanent'),
  startsAt: dateOnlySchema,
  endsAt: dateOnlySchema.nullable(),
  endReason: matchEndReasonSchema.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  elder: matchElderSummarySchema,
  volunteer: matchVolunteerSummarySchema,
});

export const permanentMatchesResponseSchema = z.object({
  matches: z.array(permanentMatchSchema),
  unmatchedElders: z.array(matchElderSummarySchema),
  matchableVolunteers: z.array(matchVolunteerSummarySchema),
});

export const createPermanentMatchSchema = z.object({
  elderId: z.string().uuid(),
  volunteerId: z.string().uuid(),
  startsAt: dateOnlySchema.optional(),
});

export const endPermanentMatchSchema = z.object({
  endReason: matchEndReasonSchema,
  endsAt: dateOnlySchema.optional(),
});

export type MatchType = z.infer<typeof matchTypeSchema>;
export type MatchEndReason = z.infer<typeof matchEndReasonSchema>;
export type MatchElderSummary = z.infer<typeof matchElderSummarySchema>;
export type MatchVolunteerSummary = z.infer<typeof matchVolunteerSummarySchema>;
export type PermanentMatch = z.infer<typeof permanentMatchSchema>;
export type PermanentMatchesResponse = z.infer<
  typeof permanentMatchesResponseSchema
>;
export type CreatePermanentMatch = z.infer<typeof createPermanentMatchSchema>;
export type EndPermanentMatch = z.infer<typeof endPermanentMatchSchema>;
