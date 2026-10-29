import { Injectable, Logger } from '@nestjs/common';
import type {
  NotificationPayload,
  NotificationProvider,
  NotificationSendResult,
  PushSubscriptionTarget,
} from './notification.provider';

@Injectable()
export class LoggingNotificationProvider implements NotificationProvider {
  private readonly logger = new Logger(LoggingNotificationProvider.name);

  send(
    subscription: PushSubscriptionTarget,
    payload: NotificationPayload
  ): Promise<NotificationSendResult> {
    this.logger.log(
      `No-op push ${payload.templateKey} to ${payload.userId} via ${subscription.endpoint}`
    );
    return Promise.resolve({ ok: true });
  }
}
