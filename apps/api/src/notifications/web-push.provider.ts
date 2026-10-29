import { Injectable, Logger } from '@nestjs/common';
import webpush from 'web-push';
import type {
  NotificationPayload,
  NotificationProvider,
  NotificationSendResult,
  PushSubscriptionTarget,
} from './notification.provider';

function webPushStatusCode(error: unknown): number | undefined {
  if (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof error.statusCode === 'number'
  ) {
    return error.statusCode;
  }
  return undefined;
}

export interface WebPushProviderOptions {
  publicKey: string;
  privateKey: string;
  subject: string;
}

@Injectable()
export class WebPushNotificationProvider implements NotificationProvider {
  private readonly logger = new Logger(WebPushNotificationProvider.name);

  constructor(options: WebPushProviderOptions) {
    webpush.setVapidDetails(
      options.subject,
      options.publicKey,
      options.privateKey
    );
  }

  async send(
    subscription: PushSubscriptionTarget,
    payload: NotificationPayload
  ): Promise<NotificationSendResult> {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        JSON.stringify({
          title: payload.title,
          body: payload.body,
          data: payload.data,
        })
      );
      return { ok: true };
    } catch (error: unknown) {
      const statusCode = webPushStatusCode(error);
      const message = error instanceof Error ? error.message : 'unknown_error';
      if (statusCode !== undefined) {
        const gone = statusCode === 404 || statusCode === 410;
        this.logger.warn(
          `Web Push failed (${statusCode}) for ${payload.userId}: ${message}`
        );
        return { ok: false, gone, error: message };
      }

      this.logger.warn(`Web Push failed for ${payload.userId}: ${message}`);
      return { ok: false, error: message };
    }
  }
}
