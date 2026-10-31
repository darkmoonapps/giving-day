import { z } from 'zod';
import { deliveryElderSchema, deliveryStatusSchema } from './delivery';

export const routeCoordSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

export const volunteerRouteCenterSchema = z.object({
  address: z.string(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  placed: z.boolean(),
});

export const volunteerRouteStopSchema = z.object({
  deliveryId: z.string().uuid(),
  visitOrder: z.number().int().positive().nullable(),
  placed: z.boolean(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  status: deliveryStatusSchema,
  elder: deliveryElderSchema,
});

export const volunteerDayRouteSchema = z.object({
  dayId: z.string().uuid(),
  cityId: z.string().uuid(),
  cityNameHe: z.string(),
  cityNameEn: z.string(),
  center: volunteerRouteCenterSchema,
  stops: z.array(volunteerRouteStopSchema),
});

export type VolunteerRouteCenter = z.infer<typeof volunteerRouteCenterSchema>;
export type VolunteerRouteStop = z.infer<typeof volunteerRouteStopSchema>;
export type VolunteerDayRoute = z.infer<typeof volunteerDayRouteSchema>;
