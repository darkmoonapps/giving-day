import { Module } from '@nestjs/common';
import { AbilitiesModule } from '../abilities/abilities.module';
import { AuthModule } from '../auth/auth.module';
import { DeliveriesController } from './deliveries.controller';
import { DeliveriesService } from './deliveries.service';

@Module({
  imports: [AbilitiesModule, AuthModule],
  controllers: [DeliveriesController],
  providers: [DeliveriesService],
  exports: [DeliveriesService],
})
export class DeliveriesModule {}
