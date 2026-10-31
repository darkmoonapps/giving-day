import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseBoolPipe,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ElderStatus } from '@prisma/client';
import type {
  Elder,
  EldersResponse,
  ListEldersQuery,
} from '@giving-day/shared';
import type { UserWithMemberships } from '../abilities/ability.factory';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireAbilities } from '../auth/decorators/require-abilities.decorator';
import { AbilitiesGuard } from '../auth/guards/abilities.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateElderDto } from './dto/create-elder.dto';
import { ElderResponseDto, EldersResponseDto } from './dto/elder-response.dto';
import { UpdateElderDto } from './dto/update-elder.dto';
import { EldersService } from './elders.service';

@ApiTags('elders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AbilitiesGuard)
@Controller('cities/:cityId/elders')
export class EldersController {
  constructor(private readonly eldersService: EldersService) {}

  @Get()
  @RequireAbilities({ action: 'read', subject: 'Elder' })
  @ApiOperation({
    operationId: 'listCityElders',
    summary:
      'List elders for a city (coordinators and super admins; excludes archived by default)',
  })
  @ApiParam({ name: 'cityId', type: String, format: 'uuid' })
  @ApiQuery({ name: 'status', required: false, enum: ElderStatus })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean })
  @ApiOkResponse({ type: EldersResponseDto })
  async list(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @CurrentUser() user: UserWithMemberships,
    @Query('status', new ParseEnumPipe(ElderStatus, { optional: true }))
    status?: ElderStatus,
    @Query('includeArchived', new DefaultValuePipe(false), ParseBoolPipe)
    includeArchived?: boolean
  ): Promise<EldersResponse> {
    const query: ListEldersQuery = {
      ...(status ? { status } : {}),
      includeArchived,
    };
    return this.eldersService.list(cityId, query, user);
  }

  @Post()
  @RequireAbilities({ action: 'create', subject: 'Elder' })
  @ApiBody({ type: CreateElderDto })
  @ApiOperation({
    operationId: 'createCityElder',
    summary: 'Create an elder and optional next-of-kin contacts for a city',
  })
  @ApiParam({ name: 'cityId', type: String, format: 'uuid' })
  @ApiCreatedResponse({ type: ElderResponseDto })
  async create(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @Body() dto: CreateElderDto,
    @CurrentUser() user: UserWithMemberships
  ): Promise<Elder> {
    return this.eldersService.create(cityId, dto, user);
  }

  @Get(':elderId')
  @RequireAbilities({ action: 'read', subject: 'Elder' })
  @ApiOperation({
    operationId: 'getCityElder',
    summary: 'Get one city elder including next-of-kin contacts',
  })
  @ApiParam({ name: 'cityId', type: String, format: 'uuid' })
  @ApiParam({ name: 'elderId', type: String, format: 'uuid' })
  @ApiOkResponse({ type: ElderResponseDto })
  async get(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @Param('elderId', ParseUUIDPipe) elderId: string,
    @CurrentUser() user: UserWithMemberships
  ): Promise<Elder> {
    return this.eldersService.get(cityId, elderId, user);
  }

  @Patch(':elderId')
  @RequireAbilities({ action: 'update', subject: 'Elder' })
  @ApiBody({ type: UpdateElderDto })
  @ApiOperation({
    operationId: 'updateCityElder',
    summary:
      'Update a city elder; when contacts are sent they replace the current next-of-kin set',
  })
  @ApiParam({ name: 'cityId', type: String, format: 'uuid' })
  @ApiParam({ name: 'elderId', type: String, format: 'uuid' })
  @ApiOkResponse({ type: ElderResponseDto })
  async update(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @Param('elderId', ParseUUIDPipe) elderId: string,
    @Body() dto: UpdateElderDto,
    @CurrentUser() user: UserWithMemberships
  ): Promise<Elder> {
    return this.eldersService.update(cityId, elderId, dto, user);
  }

  @Post(':elderId/deactivate')
  @HttpCode(HttpStatus.OK)
  @RequireAbilities({ action: 'delete', subject: 'Elder' })
  @ApiOperation({
    operationId: 'deactivateCityElder',
    summary:
      'Deactivate a city elder (soft archive; never hard-deletes personal data)',
  })
  @ApiParam({ name: 'cityId', type: String, format: 'uuid' })
  @ApiParam({ name: 'elderId', type: String, format: 'uuid' })
  @ApiOkResponse({ type: ElderResponseDto })
  async deactivate(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @Param('elderId', ParseUUIDPipe) elderId: string,
    @CurrentUser() user: UserWithMemberships
  ): Promise<Elder> {
    return this.eldersService.deactivate(cityId, elderId, user);
  }
}
