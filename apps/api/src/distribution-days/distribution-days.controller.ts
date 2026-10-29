import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type {
  DistributionDay,
  DistributionDaysResponse,
} from '@giving-day/shared';
import type { UserWithMemberships } from '../abilities/ability.factory';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireAbilities } from '../auth/decorators/require-abilities.decorator';
import { AbilitiesGuard } from '../auth/guards/abilities.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DistributionDaysService } from './distribution-days.service';
import {
  DistributionDayResponseDto,
  DistributionDaysResponseDto,
} from './dto/distribution-day-response.dto';
import { OpenDistributionDayDto } from './dto/open-distribution-day.dto';

@ApiTags('distribution-days')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AbilitiesGuard)
@Controller('cities/:cityId/distribution-days')
export class DistributionDaysController {
  constructor(
    private readonly distributionDaysService: DistributionDaysService
  ) {}

  @Get()
  @RequireAbilities({ action: 'read', subject: 'DistributionDay' })
  @ApiOperation({
    operationId: 'listDistributionDays',
    summary:
      'List distribution days for a city (volunteers see published and in-progress only)',
  })
  @ApiParam({ name: 'cityId', type: String, format: 'uuid' })
  @ApiOkResponse({ type: DistributionDaysResponseDto })
  async list(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @CurrentUser() user: UserWithMemberships
  ): Promise<DistributionDaysResponse> {
    return this.distributionDaysService.list(cityId, user);
  }

  @Post()
  @RequireAbilities({ action: 'create', subject: 'DistributionDay' })
  @ApiOperation({
    operationId: 'openDistributionDay',
    summary:
      'Open a published distribution day using city-settings hours and announce it to volunteers',
  })
  @ApiParam({ name: 'cityId', type: String, format: 'uuid' })
  @ApiCreatedResponse({ type: DistributionDayResponseDto })
  async open(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @Body() dto: OpenDistributionDayDto,
    @CurrentUser() user: UserWithMemberships
  ): Promise<DistributionDay> {
    return this.distributionDaysService.open(cityId, dto, user);
  }

  @Get(':dayId')
  @RequireAbilities({ action: 'read', subject: 'DistributionDay' })
  @ApiOperation({
    operationId: 'getDistributionDay',
    summary:
      'Get one distribution day (volunteers: Flow 2 fields on open days)',
  })
  @ApiParam({ name: 'cityId', type: String, format: 'uuid' })
  @ApiParam({ name: 'dayId', type: String, format: 'uuid' })
  @ApiOkResponse({ type: DistributionDayResponseDto })
  async get(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @Param('dayId', ParseUUIDPipe) dayId: string,
    @CurrentUser() user: UserWithMemberships
  ): Promise<DistributionDay> {
    return this.distributionDaysService.get(cityId, dayId, user);
  }

  @Post(':dayId/close')
  @HttpCode(HttpStatus.OK)
  @RequireAbilities({ action: 'close', subject: 'DistributionDay' })
  @ApiOperation({
    operationId: 'closeDistributionDay',
    summary: 'Close a published or in-progress distribution day',
  })
  @ApiParam({ name: 'cityId', type: String, format: 'uuid' })
  @ApiParam({ name: 'dayId', type: String, format: 'uuid' })
  @ApiOkResponse({ type: DistributionDayResponseDto })
  async close(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @Param('dayId', ParseUUIDPipe) dayId: string,
    @CurrentUser() user: UserWithMemberships
  ): Promise<DistributionDay> {
    return this.distributionDaysService.close(cityId, dayId, user);
  }
}
