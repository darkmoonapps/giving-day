import { z } from 'zod';
import { timeOfDaySchema } from './city';
import { dateOnlySchema, dayStatusSchema } from './distribution-day';

export const dashboardVolunteerCountsSchema = z.object({
  total: z.number().int().nonnegative(),
  confirmed: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  declined: z.number().int().nonnegative(),
});

export const dashboardDeliveryCountsSchema = z.object({
  unassigned: z.number().int().nonnegative(),
  assigned: z.number().int().nonnegative(),
  picked: z.number().int().nonnegative(),
  delivered: z.number().int().nonnegative(),
  notDelivered: z.number().int().nonnegative(),
  cancelled: z.number().int().nonnegative(),
});

export const dashboardUnassignedElderSchema = z.object({
  elderId: z.string().uuid(),
  fullName: z.string(),
});

export const distributionDayDashboardSchema = z.object({
  dayId: z.string().uuid(),
  cityId: z.string().uuid(),
  date: dateOnlySchema,
  startTime: timeOfDaySchema,
  endTime: timeOfDaySchema,
  status: dayStatusSchema,
  volunteers: dashboardVolunteerCountsSchema,
  deliveries: dashboardDeliveryCountsSchema,
  unassignedElders: z.array(dashboardUnassignedElderSchema),
});

export type DashboardVolunteerCounts = z.infer<
  typeof dashboardVolunteerCountsSchema
>;
export type DashboardDeliveryCounts = z.infer<
  typeof dashboardDeliveryCountsSchema
>;
export type DashboardUnassignedElder = z.infer<
  typeof dashboardUnassignedElderSchema
>;
export type DistributionDayDashboard = z.infer<
  typeof distributionDayDashboardSchema
>;
