import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CityRole } from '@prisma/client';
import type {
  CityCoordinator,
  CityCoordinatorsResponse,
  CityJoinLinkCreated,
  CityJoinLinksResponse,
  CityMembershipRecord,
  CityPendingMembershipsResponse,
  CitySettings,
} from '@giving-day/shared';
import type { UserWithMemberships } from '../abilities/ability.factory';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireAbilities } from '../auth/decorators/require-abilities.decorator';
import { AbilitiesGuard } from '../auth/guards/abilities.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CitiesService } from './cities.service';
import { AddCoordinatorDto } from './dto/add-coordinator.dto';
import {
  CityCoordinatorDto,
  CityCoordinatorsResponseDto,
} from './dto/coordinator-response.dto';
import {
  CityJoinLinkCreatedDto,
  CityJoinLinksResponseDto,
} from './dto/join-link-response.dto';
import { CitySettingsResponseDto } from './dto/city-settings-response.dto';
import {
  CityMembershipRecordDto,
  CityPendingMembershipsResponseDto,
} from './dto/membership-response.dto';
import { UpdateCitySettingsDto } from './dto/update-city-settings.dto';

@ApiTags('cities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AbilitiesGuard)
@Controller('cities')
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @Get(':cityId/settings')
  @RequireAbilities({ action: 'read', subject: 'CitySettings' })
  @ApiOperation({
    operationId: 'getCitySettings',
    summary: 'Get settings for a city',
  })
  @ApiParam({ name: 'cityId', type: String, format: 'uuid' })
  @ApiOkResponse({ type: CitySettingsResponseDto })
  async getSettings(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @CurrentUser() user: UserWithMemberships
  ): Promise<CitySettings> {
    return this.citiesService.getSettings(cityId, user);
  }

  @Patch(':cityId/settings')
  @RequireAbilities({ action: 'update', subject: 'CitySettings' })
  @ApiBody({ type: UpdateCitySettingsDto })
  @ApiOperation({
    operationId: 'updateCitySettings',
    summary: 'Update settings for a city',
  })
  @ApiParam({ name: 'cityId', type: String, format: 'uuid' })
  @ApiOkResponse({ type: CitySettingsResponseDto })
  async updateSettings(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @Body() dto: UpdateCitySettingsDto,
    @CurrentUser() user: UserWithMemberships
  ): Promise<CitySettings> {
    return this.citiesService.updateSettings(cityId, dto, user);
  }

  @Get(':cityId/join-links')
  @RequireAbilities({ action: 'read', subject: 'CityInvite' })
  @ApiOperation({
    operationId: 'listCityJoinLinks',
    summary:
      'Get active join-link status for a city (no secret token; regenerate to get a new URL)',
  })
  @ApiParam({ name: 'cityId', type: String, format: 'uuid' })
  @ApiOkResponse({ type: CityJoinLinksResponseDto })
  async listJoinLinks(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @CurrentUser() user: UserWithMemberships
  ): Promise<CityJoinLinksResponse> {
    return this.citiesService.listJoinLinks(cityId, user);
  }

  @Post(':cityId/join-links/:role/regenerate')
  @RequireAbilities({ action: 'create', subject: 'CityInvite' })
  @ApiOperation({
    operationId: 'regenerateCityJoinLink',
    summary: 'Revoke the current join link and return a new raw token once',
  })
  @ApiParam({ name: 'cityId', type: String, format: 'uuid' })
  @ApiParam({ name: 'role', type: String, enum: CityRole })
  @ApiCreatedResponse({ type: CityJoinLinkCreatedDto })
  async regenerateJoinLink(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @Param('role', new ParseEnumPipe(CityRole)) role: CityRole,
    @CurrentUser() user: UserWithMemberships
  ): Promise<CityJoinLinkCreated> {
    return this.citiesService.regenerateJoinLink(cityId, role, user);
  }

  @Get(':cityId/coordinators')
  @RequireAbilities({ action: 'read', subject: 'CityMembership' })
  @ApiOperation({
    operationId: 'listCityCoordinators',
    summary: 'List coordinators for a city',
  })
  @ApiParam({ name: 'cityId', type: String, format: 'uuid' })
  @ApiOkResponse({ type: CityCoordinatorsResponseDto })
  async listCoordinators(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @CurrentUser() user: UserWithMemberships
  ): Promise<CityCoordinatorsResponse> {
    return this.citiesService.listCoordinators(cityId, user);
  }

  @Post(':cityId/coordinators')
  @RequireAbilities({
    action: 'create',
    subject: 'CityMembership',
    conditions: { role: 'coordinator' },
  })
  @ApiOperation({
    operationId: 'addCityCoordinator',
    summary: 'Add a coordinator to a city',
  })
  @ApiParam({ name: 'cityId', type: String, format: 'uuid' })
  @ApiCreatedResponse({ type: CityCoordinatorDto })
  async addCoordinator(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @Body() dto: AddCoordinatorDto,
    @CurrentUser() user: UserWithMemberships
  ): Promise<CityCoordinator> {
    return this.citiesService.addCoordinator(cityId, dto, user);
  }

  @Delete(':cityId/coordinators/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireAbilities({ action: 'delete', subject: 'CityMembership' })
  @ApiOperation({
    operationId: 'removeCityCoordinator',
    summary: 'Remove a coordinator from a city',
  })
  @ApiParam({ name: 'cityId', type: String, format: 'uuid' })
  @ApiParam({ name: 'userId', type: String, format: 'uuid' })
  @ApiNoContentResponse()
  async removeCoordinator(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: UserWithMemberships
  ): Promise<void> {
    await this.citiesService.removeCoordinator(cityId, userId, user);
  }

  @Get(':cityId/memberships/pending')
  @RequireAbilities({ action: 'read', subject: 'CityMembership' })
  @ApiOperation({
    operationId: 'listPendingCityMemberships',
    summary:
      'List pending join-link memberships waiting for coordinator approval',
  })
  @ApiParam({ name: 'cityId', type: String, format: 'uuid' })
  @ApiOkResponse({ type: CityPendingMembershipsResponseDto })
  async listPendingMemberships(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @CurrentUser() user: UserWithMemberships
  ): Promise<CityPendingMembershipsResponse> {
    return this.citiesService.listPendingMemberships(cityId, user);
  }

  @Post(':cityId/memberships/:membershipId/approve')
  @HttpCode(HttpStatus.OK)
  @RequireAbilities({ action: 'approve', subject: 'CityMembership' })
  @ApiOperation({
    operationId: 'approveCityMembership',
    summary: 'Approve a pending city membership (one tap; grants city access)',
  })
  @ApiParam({ name: 'cityId', type: String, format: 'uuid' })
  @ApiParam({ name: 'membershipId', type: String, format: 'uuid' })
  @ApiOkResponse({ type: CityMembershipRecordDto })
  async approveMembership(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @CurrentUser() user: UserWithMemberships
  ): Promise<CityMembershipRecord> {
    return this.citiesService.approveMembership(cityId, membershipId, user);
  }

  @Post(':cityId/memberships/:membershipId/reject')
  @HttpCode(HttpStatus.OK)
  @RequireAbilities({ action: 'reject', subject: 'CityMembership' })
  @ApiOperation({
    operationId: 'rejectCityMembership',
    summary: 'Reject a pending city membership (does not grant city access)',
  })
  @ApiParam({ name: 'cityId', type: String, format: 'uuid' })
  @ApiParam({ name: 'membershipId', type: String, format: 'uuid' })
  @ApiOkResponse({ type: CityMembershipRecordDto })
  async rejectMembership(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @CurrentUser() user: UserWithMemberships
  ): Promise<CityMembershipRecord> {
    return this.citiesService.rejectMembership(cityId, membershipId, user);
  }
}
