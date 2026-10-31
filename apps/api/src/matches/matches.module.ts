import { Module } from '@nestjs/common';
import { AbilitiesModule } from '../abilities/abilities.module';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';

@Module({
  imports: [AbilitiesModule],
  controllers: [MatchesController],
  providers: [MatchesService],
})
export class MatchesModule {}
