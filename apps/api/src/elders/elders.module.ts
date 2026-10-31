import { Module } from '@nestjs/common';
import { AbilitiesModule } from '../abilities/abilities.module';
import { EldersController } from './elders.controller';
import { EldersService } from './elders.service';

@Module({
  imports: [AbilitiesModule],
  controllers: [EldersController],
  providers: [EldersService],
})
export class EldersModule {}
