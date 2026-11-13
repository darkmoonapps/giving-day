import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { CronSecretGuard } from './cron-secret.guard';
import { JobsController } from './jobs.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [JobsController],
  providers: [CronSecretGuard],
})
export class JobsModule {}
