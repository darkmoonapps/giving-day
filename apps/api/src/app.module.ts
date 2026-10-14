import { Module } from '@nestjs/common';
import { SentryModule } from '@sentry/nestjs/setup';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [SentryModule.forRoot(), PrismaModule, HealthModule],
})
export class AppModule {}
