import type { TemplateKey } from '@giving-day/shared';

export const NOTIFICATION_PROVIDER = Symbol('NOTIFICATION_PROVIDER');

export interface PushSubscriptionTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface NotificationPayload {
  userId: string;
  cityId: string;
  templateKey: TemplateKey;
  title: string;
  body: string;
  data: Record<string, string>;
  dayId?: string;
  deliveryId?: string;
  dedupeKey: string;
}

export interface NotificationSendResult {
  ok: boolean;
  gone?: boolean;
  error?: string;
}

export interface NotificationProvider {
  send(
    subscription: PushSubscriptionTarget,
    payload: NotificationPayload
  ): Promise<NotificationSendResult>;
}

export function vapidPublicKeyFromEnv(): string | null {
  const value = process.env.VAPID_PUBLIC_KEY?.trim();
  return value ? value : null;
}

export function vapidPrivateKeyFromEnv(): string | null {
  const value = process.env.VAPID_PRIVATE_KEY?.trim();
  return value ? value : null;
}

export function vapidSubjectFromEnv(): string {
  return process.env.VAPID_SUBJECT?.trim() || 'mailto:noreply@example.com';
}

export function isWebPushConfigured(): boolean {
  return Boolean(vapidPublicKeyFromEnv() && vapidPrivateKeyFromEnv());
}
