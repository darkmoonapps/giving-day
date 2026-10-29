import { Module } from '@nestjs/common';
import { AbilitiesModule } from '../abilities/abilities.module';
import { AuthModule } from '../auth/auth.module';
import { createNotificationProvider } from './create-notification-provider';
import { NOTIFICATION_PROVIDER } from './notification.provider';
import { NotificationsService } from './notifications.service';
import { PushSubscriptionsController } from './push-subscriptions.controller';
import { PushSubscriptionsService } from './push-subscriptions.service';

@Module({
  imports: [AbilitiesModule, AuthModule],
  controllers: [PushSubscriptionsController],
  providers: [
    {
      provide: NOTIFICATION_PROVIDER,
      useFactory: createNotificationProvider,
    },
    NotificationsService,
    PushSubscriptionsService,
  ],
  exports: [NotificationsService, NOTIFICATION_PROVIDER],
})
export class NotificationsModule {}
