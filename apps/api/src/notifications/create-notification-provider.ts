import { LoggingNotificationProvider } from './logging.provider';
import {
  isWebPushConfigured,
  vapidPrivateKeyFromEnv,
  vapidPublicKeyFromEnv,
  vapidSubjectFromEnv,
  type NotificationProvider,
} from './notification.provider';
import { WebPushNotificationProvider } from './web-push.provider';

export function createNotificationProvider(): NotificationProvider {
  if (!isWebPushConfigured()) {
    return new LoggingNotificationProvider();
  }

  return new WebPushNotificationProvider({
    publicKey: vapidPublicKeyFromEnv() ?? '',
    privateKey: vapidPrivateKeyFromEnv() ?? '',
    subject: vapidSubjectFromEnv(),
  });
}
