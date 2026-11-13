import { Module } from '@nestjs/common';
import { AbilitiesModule } from '../abilities/abilities.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { OneTimeMatchesController } from './one-time-matches.controller';

@Module({
  imports: [AbilitiesModule, AuditLogsModule],
  controllers: [MatchesController, OneTimeMatchesController],
  providers: [MatchesService],
})
export class MatchesModule {}
