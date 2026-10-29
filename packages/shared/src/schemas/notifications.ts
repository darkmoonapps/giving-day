import { z } from 'zod';

export const templateKeySchema = z.enum([
  'day_invite',
  'confirm_reminder',
  'unpicked_warning',
  'final_status_reminder',
  'reassigned',
  'change_request_reviewed',
  'membership_approved',
]);

export const notificationChannelSchema = z.enum(['push']);

export const notificationStatusSchema = z.enum(['sent', 'failed', 'clicked']);

export const upsertPushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(2048),
  p256dh: z.string().min(1).max(512),
  auth: z.string().min(1).max(512),
  userAgent: z.string().max(512).optional(),
});

export const pushSubscriptionSchema = z.object({
  id: z.string().uuid(),
  endpoint: z.string().url(),
  userAgent: z.string(),
  createdAt: z.string().datetime(),
  lastSuccessAt: z.string().datetime().nullable(),
  failedCount: z.number().int().min(0),
  disabledAt: z.string().datetime().nullable(),
});

export const pushSubscriptionsResponseSchema = z.object({
  subscriptions: z.array(pushSubscriptionSchema),
});

export const vapidPublicKeySchema = z.object({
  publicKey: z.string().nullable(),
  configured: z.boolean(),
});

export const announceDistributionDayResultSchema = z.object({
  attempted: z.number().int().min(0),
  sent: z.number().int().min(0),
  failed: z.number().int().min(0),
  skipped: z.number().int().min(0),
});

export type TemplateKey = z.infer<typeof templateKeySchema>;
export type NotificationChannel = z.infer<typeof notificationChannelSchema>;
export type NotificationStatus = z.infer<typeof notificationStatusSchema>;
export type UpsertPushSubscription = z.infer<
  typeof upsertPushSubscriptionSchema
>;
export type PushSubscription = z.infer<typeof pushSubscriptionSchema>;
export type PushSubscriptionsResponse = z.infer<
  typeof pushSubscriptionsResponseSchema
>;
export type VapidPublicKey = z.infer<typeof vapidPublicKeySchema>;
export type AnnounceDistributionDayResult = z.infer<
  typeof announceDistributionDayResultSchema
>;
