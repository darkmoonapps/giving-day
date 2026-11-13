import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  AUDIT_LOG_PAGE_SIZE_DEFAULT,
  type CityAuditLogsResponse,
} from '@giving-day/shared';
import type { UserWithMemberships } from '../abilities/ability.factory';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireAbilities } from '../auth/decorators/require-abilities.decorator';
import { AbilitiesGuard } from '../auth/guards/abilities.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditLogsService } from './audit-logs.service';
import { CityAuditLogsResponseDto } from './dto/audit-log-response.dto';

@ApiTags('audit-logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AbilitiesGuard)
@Controller('cities/:cityId/audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @RequireAbilities({ action: 'read', subject: 'AuditLog' })
  @ApiOperation({
    operationId: 'listCityAuditLogs',
    summary:
      'List city audit log entries for coordinators (newest first, paged)',
  })
  @ApiParam({ name: 'cityId', type: String, format: 'uuid' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    type: Number,
    example: AUDIT_LOG_PAGE_SIZE_DEFAULT,
  })
  @ApiOkResponse({ type: CityAuditLogsResponseDto })
  async list(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @CurrentUser() user: UserWithMemberships,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query(
      'pageSize',
      new DefaultValuePipe(AUDIT_LOG_PAGE_SIZE_DEFAULT),
      ParseIntPipe
    )
    pageSize: number
  ): Promise<CityAuditLogsResponse> {
    return this.auditLogsService.listForCity(cityId, { page, pageSize }, user);
  }
}
