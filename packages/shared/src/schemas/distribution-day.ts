import { z } from 'zod';
import { timeOfDaySchema } from './city';
import { ownDayParticipationSchema } from './participation';

export const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const dateOnlySchema = z
  .string()
  .regex(DATE_ONLY_PATTERN, 'validation.invalid_date')
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, 'validation.invalid_date');

export const dayStatusSchema = z.enum([
  'draft',
  'published',
  'in_progress',
  'closed',
  'cancelled',
]);

export const openDayStatusSchema = z.enum(['published', 'in_progress']);

export const distributionDayVolunteerSchema = z.object({
  id: z.string().uuid(),
  cityId: z.string().uuid(),
  date: dateOnlySchema,
  startTime: timeOfDaySchema,
  endTime: timeOfDaySchema,
  notesForVolunteers: z.string().nullable(),
  addOns: z.array(z.string()),
  status: dayStatusSchema,
  publishedAt: z.string().datetime().nullable(),
  closedAt: z.string().datetime().nullable(),
  myParticipation: ownDayParticipationSchema.nullable().optional(),
});

export const distributionDayCoordinatorSchema =
  distributionDayVolunteerSchema.extend({
    internalNotes: z.string().nullable(),
    createdById: z.string().uuid(),
  });

export const distributionDaysResponseSchema = z.object({
  days: z.array(
    z.union([distributionDayCoordinatorSchema, distributionDayVolunteerSchema])
  ),
});

export const openDistributionDaySchema = z.object({
  date: dateOnlySchema,
  startTime: timeOfDaySchema.optional(),
  endTime: timeOfDaySchema.optional(),
  notesForVolunteers: z.string().max(4000).nullable().optional(),
  internalNotes: z.string().max(4000).nullable().optional(),
  addOns: z.array(z.string().max(200)).max(20).optional(),
});

export type DayStatus = z.infer<typeof dayStatusSchema>;
export type OpenDayStatus = z.infer<typeof openDayStatusSchema>;
export type DistributionDayVolunteer = z.infer<
  typeof distributionDayVolunteerSchema
>;
export type DistributionDayCoordinator = z.infer<
  typeof distributionDayCoordinatorSchema
>;
export type DistributionDay =
  DistributionDayCoordinator | DistributionDayVolunteer;
export type DistributionDaysResponse = z.infer<
  typeof distributionDaysResponseSchema
>;
export type OpenDistributionDay = z.infer<typeof openDistributionDaySchema>;
