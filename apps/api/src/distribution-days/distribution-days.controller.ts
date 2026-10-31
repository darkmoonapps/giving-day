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
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type {
  DayParticipationsResponse,
  DistributionDay,
  DistributionDayDashboard,
  DistributionDaysResponse,
  OwnDayParticipation,
} from '@giving-day/shared';
import type { UserWithMemberships } from '../abilities/ability.factory';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireAbilities } from '../auth/decorators/require-abilities.decorator';
import { AbilitiesGuard } from '../auth/guards/abilities.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DistributionDaysService } from './distribution-days.service';
import {
  DayParticipationsResponseDto,
  OwnDayParticipationDto,
} from './dto/day-participation-response.dto';
import {
  DistributionDayResponseDto,
  DistributionDaysResponseDto,
} from './dto/distribution-day-response.dto';
import { DistributionDayDashboardDto } from './dto/distribution-day-dashboard-response.dto';
import { OpenDistributionDayDto } from './dto/open-distribution-day.dto';
import { RespondToDistributionDayDto } from './dto/respond-to-distribution-day.dto';

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

  @Get(':dayId/dashboard')
  @RequireAbilities({ action: 'read', subject: 'DayParticipation' })
  @ApiOperation({
    operationId: 'getDistributionDayDashboard',
    summary:
      'Read-only coordinator overview for a distribution day (counts, coverage, delivery progress)',
  })
  @ApiParam({ name: 'cityId', type: String, format: 'uuid' })
  @ApiParam({ name: 'dayId', type: String, format: 'uuid' })
  @ApiOkResponse({ type: DistributionDayDashboardDto })
  async getDashboard(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @Param('dayId', ParseUUIDPipe) dayId: string,
    @CurrentUser() user: UserWithMemberships
  ): Promise<DistributionDayDashboard> {
    return this.distributionDaysService.getDashboard(cityId, dayId, user);
  }

  @Get(':dayId/participations')
  @RequireAbilities({ action: 'read', subject: 'DayParticipation' })
  @ApiOperation({
    operationId: 'listDayParticipations',
    summary:
      "List each active volunteer's response for a distribution day (coordinators)",
  })
  @ApiParam({ name: 'cityId', type: String, format: 'uuid' })
  @ApiParam({ name: 'dayId', type: String, format: 'uuid' })
  @ApiOkResponse({ type: DayParticipationsResponseDto })
  async listParticipations(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @Param('dayId', ParseUUIDPipe) dayId: string,
    @CurrentUser() user: UserWithMemberships
  ): Promise<DayParticipationsResponse> {
    return this.distributionDaysService.listParticipations(cityId, dayId, user);
  }

  @Post(':dayId/participations')
  @HttpCode(HttpStatus.OK)
  @RequireAbilities({ action: 'create', subject: 'DayParticipation' })
  @ApiBody({ type: RespondToDistributionDayDto })
  @ApiOperation({
    operationId: 'respondToDistributionDay',
    summary:
      'Confirm or decline own participation for an open distribution day',
  })
  @ApiParam({ name: 'cityId', type: String, format: 'uuid' })
  @ApiParam({ name: 'dayId', type: String, format: 'uuid' })
  @ApiOkResponse({ type: OwnDayParticipationDto })
  async respond(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @Param('dayId', ParseUUIDPipe) dayId: string,
    @Body() dto: RespondToDistributionDayDto,
    @CurrentUser() user: UserWithMemberships
  ): Promise<OwnDayParticipation> {
    return this.distributionDaysService.respond(cityId, dayId, dto, user);
  }
}
