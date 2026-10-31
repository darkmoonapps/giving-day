import { Module } from '@nestjs/common';
import { SentryModule } from '@sentry/nestjs/setup';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CitiesModule } from './cities/cities.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { DistributionDaysModule } from './distribution-days/distribution-days.module';
import { EldersModule } from './elders/elders.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    PrismaModule,
    HealthModule,
    AuthModule,
    CitiesModule,
    NotificationsModule,
    DistributionDaysModule,
    DeliveriesModule,
    EldersModule,
  ],
})
export class AppModule {}
