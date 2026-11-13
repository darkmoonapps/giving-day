import { z } from 'zod';

export const AUDIT_LOG_PAGE_SIZE_DEFAULT = 20;
export const AUDIT_LOG_PAGE_SIZE_MAX = 50;

export const AUDIT_ACTIONS = [
  'delivery.assign',
  'delivery.unassign',
  'distribution_day.publish',
  'distribution_day.update',
  'match.create',
  'match.end',
  'membership.approve',
  'membership.reject',
  'message_template.upsert',
  'message_template.reset',
] as const;

export const auditActionSchema = z.enum(AUDIT_ACTIONS);

export const auditEntitySchema = z.enum([
  'delivery',
  'distribution_day',
  'match',
  'membership',
  'message_template',
]);

/** Diff values are ids, enums, booleans, or the literal "changed" — never raw PII. */
export const auditDiffValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const auditDiffSchema = z.record(z.string(), auditDiffValueSchema);

export const auditLogEntrySchema = z.object({
  id: z.string().uuid(),
  cityId: z.string().uuid().nullable(),
  actorId: z.string().uuid(),
  action: z.string().min(1),
  entity: z.string().min(1),
  entityId: z.string().uuid(),
  diff: auditDiffSchema,
  at: z.string().datetime(),
});

export const listCityAuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(AUDIT_LOG_PAGE_SIZE_MAX)
    .default(AUDIT_LOG_PAGE_SIZE_DEFAULT),
});

export const cityAuditLogsResponseSchema = z.object({
  entries: z.array(auditLogEntrySchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(AUDIT_LOG_PAGE_SIZE_MAX),
  total: z.number().int().min(0),
});

export type AuditAction = z.infer<typeof auditActionSchema>;
export type AuditEntity = z.infer<typeof auditEntitySchema>;
export type AuditDiff = z.infer<typeof auditDiffSchema>;
export type AuditLogEntry = z.infer<typeof auditLogEntrySchema>;
export type ListCityAuditLogsQuery = z.infer<
  typeof listCityAuditLogsQuerySchema
>;
export type CityAuditLogsResponse = z.infer<typeof cityAuditLogsResponseSchema>;
