import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { RedeemJoinLinkResponse } from '@giving-day/shared';
import type { UserWithMemberships } from '../abilities/ability.factory';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AbilitiesGuard } from '../auth/guards/abilities.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CitiesService } from './cities.service';
import {
  RedeemJoinLinkDto,
  RedeemJoinLinkResponseDto,
} from './dto/redeem-join-link.dto';

@ApiTags('cities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AbilitiesGuard)
@Controller('join')
export class JoinController {
  constructor(private readonly citiesService: CitiesService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: RedeemJoinLinkDto })
  @ApiOperation({
    operationId: 'redeemCityJoinLink',
    summary:
      'Redeem a city join token as a pending membership (coordinator approval is still required)',
  })
  @ApiOkResponse({ type: RedeemJoinLinkResponseDto })
  async redeem(
    @Body() dto: RedeemJoinLinkDto,
    @CurrentUser() user: UserWithMemberships
  ): Promise<RedeemJoinLinkResponse> {
    return this.citiesService.redeemJoinLink(dto.token, user);
  }
}
