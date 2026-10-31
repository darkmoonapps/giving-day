import { Module } from '@nestjs/common';
import { AbilitiesModule } from '../abilities/abilities.module';
import { ElderChangeRequestsController } from './elder-change-requests.controller';
import { ElderChangeRequestsService } from './elder-change-requests.service';

@Module({
  imports: [AbilitiesModule],
  controllers: [ElderChangeRequestsController],
  providers: [ElderChangeRequestsService],
})
export class ElderChangeRequestsModule {}
