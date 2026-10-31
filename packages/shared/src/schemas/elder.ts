import { z } from 'zod';
import { e164PhoneSchema, phoneInputSchema } from './auth';
import { contactRelationSchema } from './delivery';

export const elderStatusSchema = z.enum([
  'active',
  'paused',
  'hospitalized',
  'moved',
  'deceased',
  'removed',
]);

export const geocodeStatusSchema = z.enum([
  'pending',
  'ok',
  'failed',
  'manual',
]);

function emptyStringToNull(value: unknown): unknown {
  if (typeof value === 'string' && value.trim().length === 0) {
    return null;
  }
  return value;
}

export const optionalNullablePhoneSchema = z.preprocess(
  emptyStringToNull,
  z.union([phoneInputSchema, z.null()]).optional()
);

export const optionalNullableTextSchema = z.preprocess(
  emptyStringToNull,
  z.string().trim().min(1).max(2000).nullable().optional()
);

export const elderContactSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  relation: contactRelationSchema,
  phone: e164PhoneSchema,
  isPrimary: z.boolean(),
});

export const elderContactInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  relation: contactRelationSchema,
  phone: phoneInputSchema,
  isPrimary: z.boolean().optional().default(false),
});

export const elderSchema = z.object({
  id: z.string().uuid(),
  cityId: z.string().uuid(),
  fullName: z.string().min(1),
  phone: e164PhoneSchema.nullable(),
  phoneAlt: e164PhoneSchema.nullable(),
  language: z.string().min(1),
  street: z.string().min(1),
  houseNumber: z.string().min(1),
  entrance: z.string().nullable(),
  floor: z.string().nullable(),
  apartment: z.string().nullable(),
  buildingCode: z.string().nullable(),
  addressNotes: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  geocodeStatus: geocodeStatusSchema,
  status: elderStatusSchema,
  statusReason: z.string().nullable(),
  notes: z.string().nullable(),
  archivedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  contacts: z.array(elderContactSchema),
});

export const eldersResponseSchema = z.object({
  elders: z.array(elderSchema),
});

const latSchema = z.number().gte(-90).lte(90);
const lngSchema = z.number().gte(-180).lte(180);

export const createElderSchema = z
  .object({
    fullName: z.string().trim().min(1).max(200),
    phone: optionalNullablePhoneSchema,
    phoneAlt: optionalNullablePhoneSchema,
    language: z.string().trim().min(1).max(20).optional(),
    street: z.string().trim().min(1).max(200),
    houseNumber: z.string().trim().min(1).max(20),
    entrance: optionalNullableTextSchema,
    floor: optionalNullableTextSchema,
    apartment: optionalNullableTextSchema,
    buildingCode: optionalNullableTextSchema,
    addressNotes: optionalNullableTextSchema,
    lat: latSchema.nullable().optional(),
    lng: lngSchema.nullable().optional(),
    geocodeStatus: geocodeStatusSchema.optional(),
    status: elderStatusSchema.optional(),
    statusReason: optionalNullableTextSchema,
    notes: optionalNullableTextSchema,
    contacts: z.array(elderContactInputSchema).optional(),
  })
  .superRefine((value, ctx) => {
    const hasLat = value.lat !== undefined && value.lat !== null;
    const hasLng = value.lng !== undefined && value.lng !== null;
    if (hasLat !== hasLng) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'elders.lat_lng_required',
        path: hasLat ? ['lng'] : ['lat'],
      });
    }
  });

export const updateElderSchema = z
  .object({
    fullName: z.string().trim().min(1).max(200).optional(),
    phone: optionalNullablePhoneSchema,
    phoneAlt: optionalNullablePhoneSchema,
    language: z.string().trim().min(1).max(20).optional(),
    street: z.string().trim().min(1).max(200).optional(),
    houseNumber: z.string().trim().min(1).max(20).optional(),
    entrance: optionalNullableTextSchema,
    floor: optionalNullableTextSchema,
    apartment: optionalNullableTextSchema,
    buildingCode: optionalNullableTextSchema,
    addressNotes: optionalNullableTextSchema,
    lat: latSchema.nullable().optional(),
    lng: lngSchema.nullable().optional(),
    geocodeStatus: geocodeStatusSchema.optional(),
    status: elderStatusSchema.exclude(['removed']).optional(),
    statusReason: optionalNullableTextSchema,
    notes: optionalNullableTextSchema,
    contacts: z.array(elderContactInputSchema).optional(),
  })
  .superRefine((value, ctx) => {
    const hasLatKey = value.lat !== undefined;
    const hasLngKey = value.lng !== undefined;
    if (hasLatKey !== hasLngKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'elders.lat_lng_required',
        path: hasLatKey ? ['lng'] : ['lat'],
      });
      return;
    }

    const hasLat = value.lat !== undefined && value.lat !== null;
    const hasLng = value.lng !== undefined && value.lng !== null;
    if (hasLat !== hasLng) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'elders.lat_lng_required',
        path: hasLat ? ['lng'] : ['lat'],
      });
    }
  });

export const listEldersQuerySchema = z.object({
  status: elderStatusSchema.optional(),
  includeArchived: z.boolean().optional(),
});

export type ElderStatus = z.infer<typeof elderStatusSchema>;
export type GeocodeStatus = z.infer<typeof geocodeStatusSchema>;
export type ElderContact = z.infer<typeof elderContactSchema>;
export type ElderContactInput = z.infer<typeof elderContactInputSchema>;
export type Elder = z.infer<typeof elderSchema>;
export type EldersResponse = z.infer<typeof eldersResponseSchema>;
export type CreateElder = z.infer<typeof createElderSchema>;
export type UpdateElder = z.infer<typeof updateElderSchema>;
export type ListEldersQuery = z.infer<typeof listEldersQuerySchema>;
