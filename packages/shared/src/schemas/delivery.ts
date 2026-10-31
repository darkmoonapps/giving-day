import { z } from 'zod';

export const DELIVERY_NOTE_MAX_LENGTH = 2000;

export const deliveryStatusSchema = z.enum([
  'unassigned',
  'assigned',
  'picked',
  'delivered',
  'not_delivered',
  'cancelled',
]);

export const notDeliveredReasonSchema = z.enum([
  'not_home',
  'refused',
  'wrong_address',
  'hospitalized',
  'deceased',
  'other',
]);

export const volunteerDeliveryStatusSchema = z.enum([
  'picked',
  'delivered',
  'not_delivered',
]);

export const contactRelationSchema = z.enum([
  'child',
  'spouse',
  'sibling',
  'caregiver',
  'social_worker',
  'neighbor',
  'other',
]);

export const deliveryElderContactSchema = z.object({
  name: z.string(),
  relation: contactRelationSchema,
  phone: z.string(),
  isPrimary: z.boolean(),
});

export const deliveryElderSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
  street: z.string(),
  houseNumber: z.string(),
  entrance: z.string().nullable(),
  floor: z.string().nullable(),
  apartment: z.string().nullable(),
  addressNotes: z.string().nullable(),
  notes: z.string().nullable(),
  contacts: z.array(deliveryElderContactSchema),
});

export const deliveryVolunteerSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
});

export const volunteerDeliverySchema = z.object({
  id: z.string().uuid(),
  cityId: z.string().uuid(),
  dayId: z.string().uuid(),
  status: deliveryStatusSchema,
  note: z.string().nullable(),
  notDeliveredReason: notDeliveredReasonSchema.nullable(),
  elder: deliveryElderSchema,
});

export const coordinatorDeliverySchema = volunteerDeliverySchema.extend({
  volunteerId: z.string().uuid().nullable(),
  matchId: z.string().uuid().nullable(),
  assignedAt: z.string().datetime().nullable(),
  volunteer: deliveryVolunteerSchema.nullable(),
});

export const volunteerDeliveriesResponseSchema = z.object({
  dayId: z.string().uuid(),
  cityId: z.string().uuid(),
  deliveries: z.array(volunteerDeliverySchema),
});

export const coordinatorDeliveriesResponseSchema =
  volunteerDeliveriesResponseSchema.extend({
    deliveries: z.array(coordinatorDeliverySchema),
    assignableVolunteers: z.array(deliveryVolunteerSchema),
    unassignedCount: z.number().int().nonnegative(),
  });

export const dayDeliveriesResponseSchema = z.union([
  coordinatorDeliveriesResponseSchema,
  volunteerDeliveriesResponseSchema,
]);

export const assignDeliverySchema = z.object({
  volunteerId: z.string().uuid().nullable(),
});

export const updateDeliveryStatusSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('picked'),
  }),
  z.object({
    status: z.literal('delivered'),
  }),
  z.object({
    status: z.literal('not_delivered'),
    note: z.string().trim().min(1).max(DELIVERY_NOTE_MAX_LENGTH),
    notDeliveredReason: notDeliveredReasonSchema,
  }),
]);

export type DeliveryStatus = z.infer<typeof deliveryStatusSchema>;
export type NotDeliveredReason = z.infer<typeof notDeliveredReasonSchema>;
export type VolunteerDeliveryStatus = z.infer<
  typeof volunteerDeliveryStatusSchema
>;
export type ContactRelation = z.infer<typeof contactRelationSchema>;
export type DeliveryElderContact = z.infer<typeof deliveryElderContactSchema>;
export type DeliveryElder = z.infer<typeof deliveryElderSchema>;
export type DeliveryVolunteer = z.infer<typeof deliveryVolunteerSchema>;
export type VolunteerDelivery = z.infer<typeof volunteerDeliverySchema>;
export type CoordinatorDelivery = z.infer<typeof coordinatorDeliverySchema>;
export type VolunteerDeliveriesResponse = z.infer<
  typeof volunteerDeliveriesResponseSchema
>;
export type CoordinatorDeliveriesResponse = z.infer<
  typeof coordinatorDeliveriesResponseSchema
>;
export type DayDeliveriesResponse = z.infer<typeof dayDeliveriesResponseSchema>;
export type AssignDelivery = z.infer<typeof assignDeliverySchema>;
export type UpdateDeliveryStatus = z.infer<typeof updateDeliveryStatusSchema>;

export function isCoordinatorDeliveriesResponse(
  value: DayDeliveriesResponse
): value is CoordinatorDeliveriesResponse {
  return 'assignableVolunteers' in value;
}
