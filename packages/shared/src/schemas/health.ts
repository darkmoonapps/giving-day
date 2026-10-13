import { z } from 'zod';

export const healthStatusSchema = z.enum(['healthy', 'unhealthy']);

export const databaseHealthSchema = z.object({
  connected: z.boolean(),
});

export const healthResponseSchema = z.object({
  status: healthStatusSchema,
  timestamp: z.string().datetime(),
  database: databaseHealthSchema,
});

export type HealthStatus = z.infer<typeof healthStatusSchema>;
export type DatabaseHealth = z.infer<typeof databaseHealthSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;
