import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
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
  JoinLinkPreview,
  RedeemJoinLinkResponse,
} from '@giving-day/shared';
import type { UserWithMemberships } from '../abilities/ability.factory';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AbilitiesGuard } from '../auth/guards/abilities.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CitiesService } from './cities.service';
import {
  JoinLinkPreviewDto,
  RedeemJoinLinkDto,
  RedeemJoinLinkResponseDto,
} from './dto/redeem-join-link.dto';

@ApiTags('cities')
@Controller('join')
export class JoinController {
  constructor(private readonly citiesService: CitiesService) {}

  @Get(':token')
  @ApiParam({
    name: 'token',
    example: 'fake-join-token',
    description: 'Raw city join token from the shareable URL',
  })
  @ApiOperation({
    operationId: 'previewCityJoinLink',
    summary:
      'Preview which city and role a join token belongs to without creating a membership',
  })
  @ApiOkResponse({ type: JoinLinkPreviewDto })
  async preview(@Param('token') token: string): Promise<JoinLinkPreview> {
    return this.citiesService.previewJoinLink(token);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
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
