import { Module } from '@nestjs/common';
import { AbilitiesModule } from '../abilities/abilities.module';
import { AuthModule } from '../auth/auth.module';
import { GeocodingModule } from '../geocoding/geocoding.module';
import { DeliveriesController } from './deliveries.controller';
import { DeliveriesService } from './deliveries.service';
import { VolunteerRouteController } from './volunteer-route.controller';
import { VolunteerRouteService } from './volunteer-route.service';

@Module({
  imports: [AbilitiesModule, AuthModule, GeocodingModule],
  controllers: [DeliveriesController, VolunteerRouteController],
  providers: [DeliveriesService, VolunteerRouteService],
  exports: [DeliveriesService, VolunteerRouteService],
})
export class DeliveriesModule {}
