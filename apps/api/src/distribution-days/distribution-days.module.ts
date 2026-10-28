import { Module } from '@nestjs/common';
import { AbilitiesModule } from '../abilities/abilities.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DistributionDaysController } from './distribution-days.controller';
import { DistributionDaysService } from './distribution-days.service';

@Module({
  imports: [AbilitiesModule, AuthModule, NotificationsModule],
  controllers: [DistributionDaysController],
  providers: [DistributionDaysService],
})
export class DistributionDaysModule {}
