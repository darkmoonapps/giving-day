import { Module } from '@nestjs/common';
import { AbilitiesModule } from '../abilities/abilities.module';
import { AuthModule } from '../auth/auth.module';
import { CitiesController } from './cities.controller';
import { CitiesService } from './cities.service';

@Module({
  imports: [AbilitiesModule, AuthModule],
  controllers: [CitiesController],
  providers: [CitiesService],
})
export class CitiesModule {}
