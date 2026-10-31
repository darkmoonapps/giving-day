import { z } from 'zod';
import { matchVolunteerSummarySchema } from './match';
import {
  elderContactInputSchema,
  elderContactSchema,
  optionalNullableTextSchema,
} from './elder';
import { contactRelationSchema } from './delivery';
import { e164PhoneSchema } from './auth';

export const changeRequestStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
  'superseded',
]);

export const ELDER_CHANGE_REQUEST_SAFE_FIELDS = [
  'street',
  'houseNumber',
  'entrance',
  'floor',
  'apartment',
  'addressNotes',
  'notes',
  'contacts',
] as const;

export type ElderChangeRequestSafeField =
  (typeof ELDER_CHANGE_REQUEST_SAFE_FIELDS)[number];

const proposedElderChangeFieldsSchema = z
  .object({
    street: z.string().trim().min(1).max(200).optional(),
    houseNumber: z.string().trim().min(1).max(20).optional(),
    entrance: optionalNullableTextSchema,
    floor: optionalNullableTextSchema,
    apartment: optionalNullableTextSchema,
    addressNotes: optionalNullableTextSchema,
    notes: optionalNullableTextSchema,
    contacts: z.array(elderContactInputSchema).optional(),
  })
  .strict();

function hasSafeField(
  value: Partial<Record<ElderChangeRequestSafeField, unknown>>
): boolean {
  return ELDER_CHANGE_REQUEST_SAFE_FIELDS.some(
    (field) => value[field] !== undefined
  );
}

export const proposedElderChangesSchema =
  proposedElderChangeFieldsSchema.superRefine((value, ctx) => {
    if (!hasSafeField(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'change_requests.empty',
      });
    }
  });

export const createElderChangeRequestSchema = z.object({
  elderId: z.string().uuid(),
  changes: proposedElderChangesSchema,
  reason: optionalNullableTextSchema,
});

const scalarTextChangeSchema = z.object({
  from: z.string(),
  to: z.string(),
});

const nullableTextChangeSchema = z.object({
  from: z.string().nullable(),
  to: z.string().nullable(),
});

export const elderChangeRequestContactSnapshotSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  relation: contactRelationSchema,
  phone: e164PhoneSchema,
  isPrimary: z.boolean(),
});

export const elderChangeRequestChangesSchema = z
  .object({
    street: scalarTextChangeSchema.optional(),
    houseNumber: scalarTextChangeSchema.optional(),
    entrance: nullableTextChangeSchema.optional(),
    floor: nullableTextChangeSchema.optional(),
    apartment: nullableTextChangeSchema.optional(),
    addressNotes: nullableTextChangeSchema.optional(),
    notes: nullableTextChangeSchema.optional(),
    contacts: z
      .object({
        from: z.array(elderChangeRequestContactSnapshotSchema),
        to: z.array(elderContactInputSchema),
      })
      .optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!hasSafeField(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'change_requests.empty',
      });
    }
  });

export const elderChangeRequestElderSnapshotSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().min(1),
  street: z.string(),
  houseNumber: z.string(),
  entrance: z.string().nullable(),
  floor: z.string().nullable(),
  apartment: z.string().nullable(),
  addressNotes: z.string().nullable(),
  notes: z.string().nullable(),
  contacts: z.array(elderContactSchema),
});

export const elderChangeRequestSchema = z.object({
  id: z.string().uuid(),
  cityId: z.string().uuid(),
  elderId: z.string().uuid(),
  requestedById: z.string().uuid(),
  changes: elderChangeRequestChangesSchema,
  reason: z.string().nullable(),
  status: changeRequestStatusSchema,
  reviewedById: z.string().uuid().nullable(),
  reviewedAt: z.string().datetime().nullable(),
  reviewNote: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  elder: elderChangeRequestElderSnapshotSchema,
  requestedBy: matchVolunteerSummarySchema,
});

export const elderChangeRequestsResponseSchema = z.object({
  changeRequests: z.array(elderChangeRequestSchema),
});

export const listElderChangeRequestsQuerySchema = z.object({
  status: changeRequestStatusSchema.optional(),
});

export const rejectElderChangeRequestSchema = z.object({
  reviewNote: optionalNullableTextSchema,
});

export type ChangeRequestStatus = z.infer<typeof changeRequestStatusSchema>;
export type ProposedElderChanges = z.infer<typeof proposedElderChangesSchema>;
export type CreateElderChangeRequest = z.infer<
  typeof createElderChangeRequestSchema
>;
export type ElderChangeRequestContactSnapshot = z.infer<
  typeof elderChangeRequestContactSnapshotSchema
>;
export type ElderChangeRequestChanges = z.infer<
  typeof elderChangeRequestChangesSchema
>;
export type ElderChangeRequestElderSnapshot = z.infer<
  typeof elderChangeRequestElderSnapshotSchema
>;
export type ElderChangeRequest = z.infer<typeof elderChangeRequestSchema>;
export type ElderChangeRequestsResponse = z.infer<
  typeof elderChangeRequestsResponseSchema
>;
export type ListElderChangeRequestsQuery = z.infer<
  typeof listElderChangeRequestsQuerySchema
>;
export type RejectElderChangeRequest = z.infer<
  typeof rejectElderChangeRequestSchema
>;
