import { Module } from '@nestjs/common';
import { AbilitiesModule } from '../abilities/abilities.module';
import { MessageTemplatesController } from './message-templates.controller';
import { MessageTemplatesService } from './message-templates.service';

@Module({
  imports: [AbilitiesModule],
  controllers: [MessageTemplatesController],
  providers: [MessageTemplatesService],
})
export class MessageTemplatesModule {}
