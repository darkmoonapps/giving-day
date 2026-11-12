import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  TEMPLATE_KEYS,
  type MessageTemplate,
  type MessageTemplatesResponse,
} from '@giving-day/shared';
import type { UserWithMemberships } from '../abilities/ability.factory';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireAbilities } from '../auth/decorators/require-abilities.decorator';
import { AbilitiesGuard } from '../auth/guards/abilities.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  MessageTemplateResponseDto,
  MessageTemplatesResponseDto,
} from './dto/message-template-response.dto';
import { UpsertMessageTemplateDto } from './dto/upsert-message-template.dto';
import { MessageTemplatesService } from './message-templates.service';

@ApiTags('message-templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AbilitiesGuard)
@Controller('cities/:cityId/message-templates')
export class MessageTemplatesController {
  constructor(
    private readonly messageTemplatesService: MessageTemplatesService
  ) {}

  @Get()
  @RequireAbilities({ action: 'read', subject: 'MessageTemplate' })
  @ApiOperation({
    operationId: 'listCityMessageTemplates',
    summary:
      'List notification message templates for a city with default fallbacks',
  })
  @ApiParam({ name: 'cityId', type: String, format: 'uuid' })
  @ApiOkResponse({ type: MessageTemplatesResponseDto })
  async list(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @CurrentUser() user: UserWithMemberships
  ): Promise<MessageTemplatesResponse> {
    return this.messageTemplatesService.list(cityId, user);
  }

  @Put(':key/:locale')
  @RequireAbilities({ action: 'update', subject: 'MessageTemplate' })
  @ApiBody({ type: UpsertMessageTemplateDto })
  @ApiOperation({
    operationId: 'upsertCityMessageTemplate',
    summary: 'Create or update a city-specific message template override',
  })
  @ApiParam({ name: 'cityId', type: String, format: 'uuid' })
  @ApiParam({ name: 'key', type: String, enum: TEMPLATE_KEYS })
  @ApiParam({ name: 'locale', type: String, enum: ['he', 'en'] })
  @ApiOkResponse({ type: MessageTemplateResponseDto })
  async upsert(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @Param('key') key: string,
    @Param('locale') locale: string,
    @Body() dto: UpsertMessageTemplateDto,
    @CurrentUser() user: UserWithMemberships
  ): Promise<MessageTemplate> {
    return this.messageTemplatesService.upsert(cityId, key, locale, dto, user);
  }

  @Delete(':key/:locale')
  @RequireAbilities({ action: 'delete', subject: 'MessageTemplate' })
  @ApiOperation({
    operationId: 'resetCityMessageTemplate',
    summary: 'Remove a city override and fall back to the default template',
  })
  @ApiParam({ name: 'cityId', type: String, format: 'uuid' })
  @ApiParam({ name: 'key', type: String, enum: TEMPLATE_KEYS })
  @ApiParam({ name: 'locale', type: String, enum: ['he', 'en'] })
  @ApiOkResponse({ type: MessageTemplateResponseDto })
  async reset(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @Param('key') key: string,
    @Param('locale') locale: string,
    @CurrentUser() user: UserWithMemberships
  ): Promise<MessageTemplate> {
    return this.messageTemplatesService.reset(cityId, key, locale, user);
  }
}
