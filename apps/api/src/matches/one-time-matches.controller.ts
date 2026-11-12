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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { OneTimeMatch, OneTimeMatchesResponse } from '@giving-day/shared';
import type { UserWithMemberships } from '../abilities/ability.factory';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireAbilities } from '../auth/decorators/require-abilities.decorator';
import { AbilitiesGuard } from '../auth/guards/abilities.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateOneTimeMatchDto } from './dto/create-one-time-match.dto';
import { EndOneTimeMatchDto } from './dto/end-one-time-match.dto';
import {
  OneTimeMatchResponseDto,
  OneTimeMatchesResponseDto,
} from './dto/match-response.dto';
import { MatchesService } from './matches.service';

@ApiTags('one-time-matches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AbilitiesGuard)
@Controller('cities/:cityId/distribution-days/:dayId/one-time-matches')
export class OneTimeMatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get()
  @RequireAbilities({ action: 'manage', subject: 'Match' })
  @ApiOperation({
    operationId: 'listDayOneTimeMatches',
    summary:
      'List current one-time volunteer–elder matches for a distribution day (coordinators)',
  })
  @ApiParam({ name: 'cityId', type: String, format: 'uuid' })
  @ApiParam({ name: 'dayId', type: String, format: 'uuid' })
  @ApiOkResponse({ type: OneTimeMatchesResponseDto })
  async list(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @Param('dayId', ParseUUIDPipe) dayId: string,
    @CurrentUser() user: UserWithMemberships
  ): Promise<OneTimeMatchesResponse> {
    return this.matchesService.listOneTime(cityId, dayId, user);
  }

  @Post()
  @RequireAbilities({ action: 'create', subject: 'Match' })
  @ApiBody({ type: CreateOneTimeMatchDto })
  @ApiOperation({
    operationId: 'createDayOneTimeMatch',
    summary:
      'Create a one-time match for an active elder and a volunteer confirmed for that distribution day',
  })
  @ApiParam({ name: 'cityId', type: String, format: 'uuid' })
  @ApiParam({ name: 'dayId', type: String, format: 'uuid' })
  @ApiCreatedResponse({ type: OneTimeMatchResponseDto })
  @ApiConflictResponse({
    description: 'Elder already has a current one-time match for this day',
  })
  async create(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @Param('dayId', ParseUUIDPipe) dayId: string,
    @Body() dto: CreateOneTimeMatchDto,
    @CurrentUser() user: UserWithMemberships
  ): Promise<OneTimeMatch> {
    return this.matchesService.createOneTime(cityId, dayId, dto, user);
  }

  @Post(':matchId/end')
  @HttpCode(HttpStatus.OK)
  @RequireAbilities({ action: 'update', subject: 'Match' })
  @ApiBody({ type: EndOneTimeMatchDto })
  @ApiOperation({
    operationId: 'endDayOneTimeMatch',
    summary: 'End a current one-time match for a distribution day',
  })
  @ApiParam({ name: 'cityId', type: String, format: 'uuid' })
  @ApiParam({ name: 'dayId', type: String, format: 'uuid' })
  @ApiParam({ name: 'matchId', type: String, format: 'uuid' })
  @ApiOkResponse({ type: OneTimeMatchResponseDto })
  async end(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @Param('dayId', ParseUUIDPipe) dayId: string,
    @Param('matchId', ParseUUIDPipe) matchId: string,
    @Body() dto: EndOneTimeMatchDto,
    @CurrentUser() user: UserWithMemberships
  ): Promise<OneTimeMatch> {
    return this.matchesService.endOneTime(cityId, dayId, matchId, dto, user);
  }
}
