import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
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
import { ChangeRequestStatus } from '@prisma/client';
import type {
  ElderChangeRequest,
  ElderChangeRequestsResponse,
  ListElderChangeRequestsQuery,
} from '@giving-day/shared';
import type { UserWithMemberships } from '../abilities/ability.factory';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireAbilities } from '../auth/decorators/require-abilities.decorator';
import { AbilitiesGuard } from '../auth/guards/abilities.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateElderChangeRequestDto } from './dto/create-elder-change-request.dto';
import {
  ElderChangeRequestResponseDto,
  ElderChangeRequestsResponseDto,
} from './dto/elder-change-request-response.dto';
import { RejectElderChangeRequestDto } from './dto/reject-elder-change-request.dto';
import { ElderChangeRequestsService } from './elder-change-requests.service';

@ApiTags('elder-change-requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AbilitiesGuard)
@Controller('cities/:cityId/elder-change-requests')
export class ElderChangeRequestsController {
  constructor(
    private readonly elderChangeRequestsService: ElderChangeRequestsService
  ) {}

  @Get()
  @RequireAbilities({ action: 'read', subject: 'ElderChangeRequest' })
  @ApiOperation({
    operationId: 'listCityElderChangeRequests',
    summary:
      'List elder change requests (coordinators: pending by default; volunteers: own only)',
  })
  @ApiParam({ name: 'cityId', type: String, format: 'uuid' })
  @ApiQuery({ name: 'status', required: false, enum: ChangeRequestStatus })
  @ApiOkResponse({ type: ElderChangeRequestsResponseDto })
  async list(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @CurrentUser() user: UserWithMemberships,
    @Query('status', new ParseEnumPipe(ChangeRequestStatus, { optional: true }))
    status?: ChangeRequestStatus
  ): Promise<ElderChangeRequestsResponse> {
    const query: ListElderChangeRequestsQuery = {
      ...(status ? { status } : {}),
    };
    return this.elderChangeRequestsService.list(cityId, query, user);
  }

  @Post()
  @RequireAbilities({ action: 'create', subject: 'ElderChangeRequest' })
  @ApiBody({ type: CreateElderChangeRequestDto })
  @ApiOperation({
    operationId: 'createCityElderChangeRequest',
    summary:
      'Volunteer submits a change request for an assigned elder (safe fields only)',
  })
  @ApiParam({ name: 'cityId', type: String, format: 'uuid' })
  @ApiCreatedResponse({ type: ElderChangeRequestResponseDto })
  async create(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @Body() dto: CreateElderChangeRequestDto,
    @CurrentUser() user: UserWithMemberships
  ): Promise<ElderChangeRequest> {
    return this.elderChangeRequestsService.create(cityId, dto, user);
  }

  @Get(':requestId')
  @RequireAbilities({ action: 'read', subject: 'ElderChangeRequest' })
  @ApiOperation({
    operationId: 'getCityElderChangeRequest',
    summary:
      'Get one elder change request (coordinators: city; volunteers: own)',
  })
  @ApiParam({ name: 'cityId', type: String, format: 'uuid' })
  @ApiParam({ name: 'requestId', type: String, format: 'uuid' })
  @ApiOkResponse({ type: ElderChangeRequestResponseDto })
  async get(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @CurrentUser() user: UserWithMemberships
  ): Promise<ElderChangeRequest> {
    return this.elderChangeRequestsService.get(cityId, requestId, user);
  }

  @Post(':requestId/approve')
  @HttpCode(HttpStatus.OK)
  @RequireAbilities({ action: 'approve', subject: 'ElderChangeRequest' })
  @ApiOperation({
    operationId: 'approveCityElderChangeRequest',
    summary:
      'Approve a pending request and apply the proposed elder field changes',
  })
  @ApiParam({ name: 'cityId', type: String, format: 'uuid' })
  @ApiParam({ name: 'requestId', type: String, format: 'uuid' })
  @ApiOkResponse({ type: ElderChangeRequestResponseDto })
  async approve(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @CurrentUser() user: UserWithMemberships
  ): Promise<ElderChangeRequest> {
    return this.elderChangeRequestsService.approve(cityId, requestId, user);
  }

  @Post(':requestId/reject')
  @HttpCode(HttpStatus.OK)
  @RequireAbilities({ action: 'reject', subject: 'ElderChangeRequest' })
  @ApiBody({ type: RejectElderChangeRequestDto, required: false })
  @ApiOperation({
    operationId: 'rejectCityElderChangeRequest',
    summary: 'Reject a pending elder change request (optional review note)',
  })
  @ApiParam({ name: 'cityId', type: String, format: 'uuid' })
  @ApiParam({ name: 'requestId', type: String, format: 'uuid' })
  @ApiOkResponse({ type: ElderChangeRequestResponseDto })
  async reject(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() dto: RejectElderChangeRequestDto | undefined,
    @CurrentUser() user: UserWithMemberships
  ): Promise<ElderChangeRequest> {
    return this.elderChangeRequestsService.reject(
      cityId,
      requestId,
      dto ?? {},
      user
    );
  }
}
