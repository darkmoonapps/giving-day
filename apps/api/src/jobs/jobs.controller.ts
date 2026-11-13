import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import {
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type {
  ConfirmRemindersJobResult,
  PickupStatusRemindersJobResult,
} from '@giving-day/shared';
import { NotificationsService } from '../notifications/notifications.service';
import { CronSecretGuard } from './cron-secret.guard';
import { ConfirmRemindersJobResultDto } from './dto/confirm-reminders-job-result.dto';
import { PickupStatusRemindersJobResultDto } from './dto/pickup-status-reminders-job-result.dto';

@ApiTags('jobs')
@ApiSecurity('cron')
@Controller('jobs')
@UseGuards(CronSecretGuard)
export class JobsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('confirm-reminders')
  @HttpCode(200)
  @ApiOperation({
    operationId: 'runConfirmRemindersJob',
    summary:
      'Send idempotent confirmation-reminder pushes to non-responding volunteers',
    description:
      'Free-tier friendly cron endpoint. Protect with CRON_SECRET via Authorization: Bearer or X-Cron-Secret. Safe to call repeatedly; NotificationLog.dedupeKey prevents duplicate pushes.',
  })
  @ApiHeader({
    name: 'X-Cron-Secret',
    required: false,
    description: 'Alternative to Authorization: Bearer <CRON_SECRET>',
  })
  @ApiOkResponse({ type: ConfirmRemindersJobResultDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid cron secret' })
  async runConfirmReminders(): Promise<ConfirmRemindersJobResult> {
    return this.notificationsService.sendConfirmReminders();
  }

  @Post('pickup-status-reminders')
  @HttpCode(200)
  @ApiOperation({
    operationId: 'runPickupStatusRemindersJob',
    summary:
      'Send idempotent unpicked-package and missing-final-status reminder pushes',
    description:
      'Free-tier friendly cron endpoint. Protect with CRON_SECRET via Authorization: Bearer or X-Cron-Secret. Safe to call repeatedly; NotificationLog.dedupeKey prevents duplicate pushes for unpicked_warning and final_status_reminder.',
  })
  @ApiHeader({
    name: 'X-Cron-Secret',
    required: false,
    description: 'Alternative to Authorization: Bearer <CRON_SECRET>',
  })
  @ApiOkResponse({ type: PickupStatusRemindersJobResultDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid cron secret' })
  async runPickupStatusReminders(): Promise<PickupStatusRemindersJobResult> {
    return this.notificationsService.sendPickupStatusReminders();
  }
}
