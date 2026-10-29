import {
  Body,
  Controller,
  Delete,
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
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type {
  PushSubscription,
  PushSubscriptionsResponse,
  VapidPublicKey,
} from '@giving-day/shared';
import type { UserWithMemberships } from '../abilities/ability.factory';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireAbilities } from '../auth/decorators/require-abilities.decorator';
import { AbilitiesGuard } from '../auth/guards/abilities.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpsertPushSubscriptionDto } from './dto/upsert-push-subscription.dto';
import {
  PushSubscriptionResponseDto,
  PushSubscriptionsResponseDto,
  VapidPublicKeyDto,
} from './dto/push-subscription-response.dto';
import { PushSubscriptionsService } from './push-subscriptions.service';

@ApiTags('push-subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AbilitiesGuard)
@Controller('push-subscriptions')
export class PushSubscriptionsController {
  constructor(
    private readonly pushSubscriptionsService: PushSubscriptionsService
  ) {}

  @Get('vapid-public-key')
  @RequireAbilities({ action: 'manage', subject: 'PushSubscription' })
  @ApiOperation({
    operationId: 'getVapidPublicKey',
    summary: 'Get the Web Push VAPID public key when configured',
  })
  @ApiOkResponse({ type: VapidPublicKeyDto })
  getVapidPublicKey(): VapidPublicKey {
    return this.pushSubscriptionsService.getVapidPublicKey();
  }

  @Get()
  @RequireAbilities({ action: 'manage', subject: 'PushSubscription' })
  @ApiOperation({
    operationId: 'listPushSubscriptions',
    summary: 'List the signed-in user push subscriptions',
  })
  @ApiOkResponse({ type: PushSubscriptionsResponseDto })
  async listMine(
    @CurrentUser() user: UserWithMemberships
  ): Promise<PushSubscriptionsResponse> {
    return this.pushSubscriptionsService.listMine(user);
  }

  @Post()
  @RequireAbilities({ action: 'manage', subject: 'PushSubscription' })
  @ApiOperation({
    operationId: 'upsertPushSubscription',
    summary: 'Create or refresh a Web Push subscription for the signed-in user',
  })
  @ApiCreatedResponse({ type: PushSubscriptionResponseDto })
  async upsertMine(
    @Body() dto: UpsertPushSubscriptionDto,
    @CurrentUser() user: UserWithMemberships
  ): Promise<PushSubscription> {
    return this.pushSubscriptionsService.upsertMine(dto, user);
  }

  @Delete(':subscriptionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireAbilities({ action: 'manage', subject: 'PushSubscription' })
  @ApiOperation({
    operationId: 'deletePushSubscription',
    summary: 'Delete one of the signed-in user push subscriptions',
  })
  @ApiParam({ name: 'subscriptionId', type: String, format: 'uuid' })
  @ApiNoContentResponse()
  async deleteMine(
    @Param('subscriptionId', ParseUUIDPipe) subscriptionId: string,
    @CurrentUser() user: UserWithMemberships
  ): Promise<void> {
    await this.pushSubscriptionsService.deleteMine(subscriptionId, user);
  }
}
