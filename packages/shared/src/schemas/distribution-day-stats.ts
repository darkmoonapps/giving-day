import { z } from 'zod';
import { dateOnlySchema, dayStatusSchema } from './distribution-day';

export const pastDistributionDayStatsSchema = z.object({
  dayId: z.string().uuid(),
  date: dateOnlySchema,
  status: dayStatusSchema,
  eldersServed: z.number().int().nonnegative(),
  packagesDelivered: z.number().int().nonnegative(),
  packagesNotDelivered: z.number().int().nonnegative(),
  packagesOpen: z.number().int().nonnegative(),
  volunteersConfirmed: z.number().int().nonnegative(),
  volunteersDeclined: z.number().int().nonnegative(),
});

export const pastDistributionDayStatsTotalsSchema = z.object({
  days: z.number().int().nonnegative(),
  eldersServed: z.number().int().nonnegative(),
  packagesDelivered: z.number().int().nonnegative(),
  packagesNotDelivered: z.number().int().nonnegative(),
  packagesOpen: z.number().int().nonnegative(),
  volunteersConfirmed: z.number().int().nonnegative(),
  volunteersDeclined: z.number().int().nonnegative(),
});

export const cityPastDistributionDaysStatsSchema = z.object({
  cityId: z.string().uuid(),
  days: z.array(pastDistributionDayStatsSchema),
  totals: pastDistributionDayStatsTotalsSchema,
});

export type PastDistributionDayStats = z.infer<
  typeof pastDistributionDayStatsSchema
>;
export type PastDistributionDayStatsTotals = z.infer<
  typeof pastDistributionDayStatsTotalsSchema
>;
export type CityPastDistributionDaysStats = z.infer<
  typeof cityPastDistributionDaysStatsSchema
>;
