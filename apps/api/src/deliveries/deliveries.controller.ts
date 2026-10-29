import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import type {
  CoordinatorDelivery,
  DayDeliveriesResponse,
} from '@giving-day/shared';
import type { UserWithMemberships } from '../abilities/ability.factory';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireAbilities } from '../auth/decorators/require-abilities.decorator';
import { AbilitiesGuard } from '../auth/guards/abilities.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DeliveriesService } from './deliveries.service';
import { AssignDeliveryDto } from './dto/assign-delivery.dto';
import {
  DayDeliveriesResponseDto,
  DeliveryResponseDto,
} from './dto/delivery-response.dto';

@ApiTags('deliveries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AbilitiesGuard)
@Controller('cities/:cityId/distribution-days/:dayId/deliveries')
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get()
  @RequireAbilities({ action: 'read', subject: 'Delivery' })
  @ApiOperation({
    operationId: 'listDayDeliveries',
    summary:
      "List a day's deliveries (coordinators: all; volunteers: own assigned after confirm)",
  })
  @ApiParam({ name: 'cityId', type: String, format: 'uuid' })
  @ApiParam({ name: 'dayId', type: String, format: 'uuid' })
  @ApiOkResponse({ type: DayDeliveriesResponseDto })
  async list(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @Param('dayId', ParseUUIDPipe) dayId: string,
    @CurrentUser() user: UserWithMemberships
  ): Promise<DayDeliveriesResponse> {
    return this.deliveriesService.list(cityId, dayId, user);
  }

  @Patch(':deliveryId')
  @RequireAbilities({ action: 'reassign', subject: 'Delivery' })
  @ApiBody({ type: AssignDeliveryDto })
  @ApiOperation({
    operationId: 'assignDayDelivery',
    summary:
      'Assign or unassign a volunteer on a delivery (coordinators; no auto-reassign)',
  })
  @ApiParam({ name: 'cityId', type: String, format: 'uuid' })
  @ApiParam({ name: 'dayId', type: String, format: 'uuid' })
  @ApiParam({ name: 'deliveryId', type: String, format: 'uuid' })
  @ApiOkResponse({ type: DeliveryResponseDto })
  async assign(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @Param('dayId', ParseUUIDPipe) dayId: string,
    @Param('deliveryId', ParseUUIDPipe) deliveryId: string,
    @Body() dto: AssignDeliveryDto,
    @CurrentUser() user: UserWithMemberships
  ): Promise<CoordinatorDelivery> {
    return this.deliveriesService.assign(cityId, dayId, deliveryId, dto, user);
  }
}
