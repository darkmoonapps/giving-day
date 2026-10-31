import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { VolunteerDayRoute } from '@giving-day/shared';
import type { UserWithMemberships } from '../abilities/ability.factory';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireAbilities } from '../auth/decorators/require-abilities.decorator';
import { AbilitiesGuard } from '../auth/guards/abilities.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VolunteerDayRouteResponseDto } from './dto/volunteer-route-response.dto';
import { VolunteerRouteService } from './volunteer-route.service';

@ApiTags('deliveries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AbilitiesGuard)
@Controller('cities/:cityId/distribution-days/:dayId/route')
export class VolunteerRouteController {
  constructor(private readonly volunteerRouteService: VolunteerRouteService) {}

  @Get()
  @RequireAbilities({ action: 'read', subject: 'Delivery' })
  @ApiOperation({
    operationId: 'getVolunteerDayRoute',
    summary:
      "Volunteer's own assigned deliveries as a suggested nearest-neighbor route from the city distribution center",
  })
  @ApiParam({ name: 'cityId', type: String, format: 'uuid' })
  @ApiParam({ name: 'dayId', type: String, format: 'uuid' })
  @ApiOkResponse({ type: VolunteerDayRouteResponseDto })
  async getRoute(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @Param('dayId', ParseUUIDPipe) dayId: string,
    @CurrentUser() user: UserWithMemberships
  ): Promise<VolunteerDayRoute> {
    return this.volunteerRouteService.getOwnRoute(cityId, dayId, user);
  }
}
