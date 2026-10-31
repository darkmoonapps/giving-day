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
import type {
  PermanentMatch,
  PermanentMatchesResponse,
} from '@giving-day/shared';
import type { UserWithMemberships } from '../abilities/ability.factory';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireAbilities } from '../auth/decorators/require-abilities.decorator';
import { AbilitiesGuard } from '../auth/guards/abilities.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePermanentMatchDto } from './dto/create-match.dto';
import { EndPermanentMatchDto } from './dto/end-match.dto';
import {
  PermanentMatchResponseDto,
  PermanentMatchesResponseDto,
} from './dto/match-response.dto';
import { MatchesService } from './matches.service';

@ApiTags('matches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AbilitiesGuard)
@Controller('cities/:cityId/matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get()
  @RequireAbilities({ action: 'manage', subject: 'Match' })
  @ApiOperation({
    operationId: 'listCityMatches',
    summary:
      'List current permanent volunteer–elder matches for a city (coordinators)',
  })
  @ApiParam({ name: 'cityId', type: String, format: 'uuid' })
  @ApiOkResponse({ type: PermanentMatchesResponseDto })
  async list(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @CurrentUser() user: UserWithMemberships
  ): Promise<PermanentMatchesResponse> {
    return this.matchesService.list(cityId, user);
  }

  @Post()
  @RequireAbilities({ action: 'create', subject: 'Match' })
  @ApiBody({ type: CreatePermanentMatchDto })
  @ApiOperation({
    operationId: 'createCityPermanentMatch',
    summary:
      'Create a permanent match for an active elder and an approved city volunteer',
  })
  @ApiParam({ name: 'cityId', type: String, format: 'uuid' })
  @ApiCreatedResponse({ type: PermanentMatchResponseDto })
  @ApiConflictResponse({
    description: 'Elder already has a current permanent match',
  })
  async create(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @Body() dto: CreatePermanentMatchDto,
    @CurrentUser() user: UserWithMemberships
  ): Promise<PermanentMatch> {
    return this.matchesService.create(cityId, dto, user);
  }

  @Post(':matchId/end')
  @HttpCode(HttpStatus.OK)
  @RequireAbilities({ action: 'update', subject: 'Match' })
  @ApiBody({ type: EndPermanentMatchDto })
  @ApiOperation({
    operationId: 'endCityMatch',
    summary: 'End a current permanent match (sets endsAt and endReason)',
  })
  @ApiParam({ name: 'cityId', type: String, format: 'uuid' })
  @ApiParam({ name: 'matchId', type: String, format: 'uuid' })
  @ApiOkResponse({ type: PermanentMatchResponseDto })
  async end(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @Param('matchId', ParseUUIDPipe) matchId: string,
    @Body() dto: EndPermanentMatchDto,
    @CurrentUser() user: UserWithMemberships
  ): Promise<PermanentMatch> {
    return this.matchesService.end(cityId, matchId, dto, user);
  }
}
